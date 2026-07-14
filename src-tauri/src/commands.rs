//! Tauri commands: the thin `invoke` surface over the vault core. All logic
//! and error handling lives in `vault`/`config`; these functions only manage
//! the open-vault state, translate errors to strings, and forward watcher
//! events to the webview as `vault:changed`.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::config::AppConfig;
use crate::theme::{self, PywalPalette, ThemeWatcher};
use crate::vault::{Document, Vault, VaultWatcher};

/// Event emitted to the frontend whenever files in the open vault change.
/// Payload: `{ paths: string[] }` with vault-relative paths.
pub const VAULT_CHANGED_EVENT: &str = "vault:changed";

/// Event emitted when a theme source file (pywal's colors.json) changes.
/// Payload: `{ source: "pywal" }`.
pub const THEME_CHANGED_EVENT: &str = "theme:changed";

#[derive(Default)]
pub struct VaultState(Mutex<Option<OpenVault>>);

struct OpenVault {
    vault: Vault,
    // Dropping the watcher (when another vault is opened) stops it; its
    // forwarding thread then exits on the closed channel.
    _watcher: VaultWatcher,
}

#[derive(Serialize)]
pub struct VaultInfo {
    pub root: PathBuf,
}

#[derive(Serialize)]
pub struct DocPayload {
    pub path: String,
    pub frontmatter: serde_json::Value,
    /// Set instead of `frontmatter` when the file's YAML is malformed, so
    /// the UI can show the problem rather than silently dropping data.
    pub frontmatter_error: Option<String>,
    pub body: String,
}

/// One entry of `schedule.md` — the frontmatter of one fenced block. The
/// frontend's schedule domain model interprets the fields; a block whose YAML
/// is broken carries the error instead so the UI can point at it.
#[derive(Serialize)]
pub struct ScheduleEntry {
    pub frontmatter: serde_json::Value,
    pub frontmatter_error: Option<String>,
}

#[derive(Serialize, Clone)]
struct VaultChangedPayload {
    paths: Vec<String>,
}

/// Watchers over theme source files, alive for the whole app run.
#[derive(Default)]
pub struct ThemeWatchState {
    pywal: Mutex<Option<ThemeWatcher>>,
}

#[derive(Serialize, Clone)]
struct ThemeChangedPayload {
    source: String,
}

/// The vault remembered in `~/.config/studium/config.toml`, if any.
#[tauri::command]
pub fn vault_default_path() -> Option<PathBuf> {
    let dir = AppConfig::default_dir()?;
    AppConfig::load_from(&dir).ok()?.vault_path
}

#[tauri::command]
pub fn vault_create(
    app: AppHandle,
    state: State<'_, VaultState>,
    path: PathBuf,
) -> Result<VaultInfo, String> {
    Vault::create(&path).map_err(|e| e.to_string())?;
    install_vault(&app, &state, &path)
}

#[tauri::command]
pub fn vault_open(
    app: AppHandle,
    state: State<'_, VaultState>,
    path: PathBuf,
) -> Result<VaultInfo, String> {
    install_vault(&app, &state, &path)
}

/// Every vault the user has opened, per the app config.
#[tauri::command]
pub fn vault_list_known() -> Vec<PathBuf> {
    let Some(dir) = AppConfig::default_dir() else {
        return Vec::new();
    };
    let cfg = AppConfig::load_from(&dir).unwrap_or_default();
    cfg.known_vaults()
}

/// Removes a vault from the known list; its files stay on disk. Closes it
/// first when it is the open vault. Returns the updated list.
#[tauri::command]
pub fn vault_forget(state: State<'_, VaultState>, path: PathBuf) -> Result<Vec<PathBuf>, String> {
    close_if_current(&state, &path)?;
    forget_in_config(&path)
}

/// Deletes a vault's directory from disk (marker-validated in the vault
/// core) and forgets it. Returns the updated list.
#[tauri::command]
pub fn vault_delete(state: State<'_, VaultState>, path: PathBuf) -> Result<Vec<PathBuf>, String> {
    // Close first so the watcher releases its handle on the tree before
    // remove_dir_all runs.
    close_if_current(&state, &path)?;
    Vault::delete(&path).map_err(|e| e.to_string())?;
    forget_in_config(&path)
}

/// Drops the open vault (and its watcher) when `path` refers to it.
fn close_if_current(state: &State<'_, VaultState>, path: &Path) -> Result<(), String> {
    let requested_root = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let is_current = guard
        .as_ref()
        .is_some_and(|open| open.vault.root() == requested_root);
    if is_current {
        *guard = None;
    }
    Ok(())
}

/// Removes `path` from the app config's vault list and returns what remains.
fn forget_in_config(path: &Path) -> Result<Vec<PathBuf>, String> {
    let dir = AppConfig::default_dir().ok_or("no config directory")?;
    let mut cfg = AppConfig::load_from(&dir).unwrap_or_default();
    // Config files store the canonicalized root, so forget that form too.
    let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    cfg.forget_vault(path);
    cfg.forget_vault(&canonical);
    cfg.save_to(&dir).map_err(|e| e.to_string())?;
    Ok(cfg.known_vaults())
}

#[tauri::command]
pub fn doc_list(state: State<'_, VaultState>, dir: String) -> Result<Vec<String>, String> {
    with_vault(&state, |vault| vault.list(&dir).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn doc_read(state: State<'_, VaultState>, path: String) -> Result<DocPayload, String> {
    with_vault(&state, |vault| {
        let doc = vault.read(&path).map_err(|e| e.to_string())?;
        let (frontmatter, frontmatter_error) = match doc.frontmatter() {
            Ok(mapping) => (
                serde_json::to_value(&mapping).map_err(|e| e.to_string())?,
                None,
            ),
            Err(e) => (serde_json::Value::Object(Default::default()), Some(e.to_string())),
        };
        Ok(DocPayload {
            path,
            frontmatter,
            frontmatter_error,
            body: doc.body().to_string(),
        })
    })
}

#[tauri::command]
pub fn doc_write(
    state: State<'_, VaultState>,
    path: String,
    frontmatter: serde_json::Value,
    body: String,
) -> Result<(), String> {
    with_vault(&state, |vault| {
        let mapping = json_to_mapping(&frontmatter)?;
        // Start from the on-disk file when it exists so a doc whose YAML we
        // couldn't parse still keeps its body semantics; body is replaced,
        // frontmatter regenerated.
        let mut doc = vault.read(&path).unwrap_or_else(|_| Document::parse(""));
        doc.set_frontmatter(mapping);
        doc.set_body(body);
        vault.write(&path, &doc).map_err(|e| e.to_string())
    })
}

/// Deletes a file or directory (recursively) at a vault-relative path —
/// a note or subject file, or a whole `plans/<slug>` directory.
#[tauri::command]
pub fn doc_delete(state: State<'_, VaultState>, path: String) -> Result<(), String> {
    with_vault(&state, |vault| vault.remove(&path).map_err(|e| e.to_string()))
}

/// The weekly schedule: one entry per frontmatter block of `schedule.md`.
#[tauri::command]
pub fn schedule_list(state: State<'_, VaultState>) -> Result<Vec<ScheduleEntry>, String> {
    with_vault(&state, |vault| {
        let docs = vault.read_all("schedule.md").map_err(|e| e.to_string())?;
        docs.iter()
            .map(|doc| {
                let (frontmatter, frontmatter_error) = match doc.frontmatter() {
                    Ok(mapping) => {
                        let value = serde_json::to_value(&mapping).map_err(|e| e.to_string())?;
                        (value, None)
                    }
                    Err(e) => (
                        serde_json::Value::Object(Default::default()),
                        Some(e.to_string()),
                    ),
                };
                Ok(ScheduleEntry {
                    frontmatter,
                    frontmatter_error,
                })
            })
            .collect()
    })
}

/// Appends one event block to `schedule.md`.
#[tauri::command]
pub fn schedule_add(
    state: State<'_, VaultState>,
    frontmatter: serde_json::Value,
) -> Result<(), String> {
    with_vault(&state, |vault| {
        let mapping = json_to_mapping(&frontmatter)?;
        let mut docs = vault.read_all("schedule.md").map_err(|e| e.to_string())?;
        let mut doc = Document::parse("");
        doc.set_frontmatter(mapping);
        docs.push(doc);
        vault.write_all("schedule.md", &docs).map_err(|e| e.to_string())
    })
}

/// Replaces the frontmatter of the `index`-th block of `schedule.md` (the
/// position in `schedule_list`'s result). Every other block is preserved
/// byte-identical.
#[tauri::command]
pub fn schedule_update(
    state: State<'_, VaultState>,
    index: usize,
    frontmatter: serde_json::Value,
) -> Result<(), String> {
    with_vault(&state, |vault| {
        let mapping = json_to_mapping(&frontmatter)?;
        let mut docs = vault.read_all("schedule.md").map_err(|e| e.to_string())?;
        let doc = docs
            .get_mut(index)
            .ok_or_else(|| format!("no schedule block at index {index}"))?;
        doc.set_frontmatter(mapping);
        vault.write_all("schedule.md", &docs).map_err(|e| e.to_string())
    })
}

/// Removes the `index`-th block of `schedule.md`.
#[tauri::command]
pub fn schedule_delete(state: State<'_, VaultState>, index: usize) -> Result<(), String> {
    with_vault(&state, |vault| {
        let mut docs = vault.read_all("schedule.md").map_err(|e| e.to_string())?;
        if index >= docs.len() {
            return Err(format!("no schedule block at index {index}"));
        }
        docs.remove(index);
        vault.write_all("schedule.md", &docs).map_err(|e| e.to_string())
    })
}

/// User theme snippets: the `.css` file names in `.studium/themes/`.
#[tauri::command]
pub fn theme_list_snippets(state: State<'_, VaultState>) -> Result<Vec<String>, String> {
    with_vault(&state, |vault| {
        vault.list_theme_snippets().map_err(|e| e.to_string())
    })
}

/// The contents of one snippet, for injection as a <style> in the webview
/// (the webview has no filesystem access of its own).
#[tauri::command]
pub fn theme_read_snippet(state: State<'_, VaultState>, name: String) -> Result<String, String> {
    with_vault(&state, |vault| {
        vault.read_theme_snippet(&name).map_err(|e| e.to_string())
    })
}

/// The current pywal palette from `~/.cache/wal/colors.json`. Also makes
/// sure the file is being watched, so a later `wal` run retints the app
/// live via `theme:changed`.
#[tauri::command]
pub fn theme_read_pywal(
    app: AppHandle,
    watch: State<'_, ThemeWatchState>,
) -> Result<PywalPalette, String> {
    let path = theme::default_pywal_path().ok_or("no cache directory on this system")?;
    ensure_pywal_watcher(&app, &watch, &path);
    theme::read_pywal(&path).map_err(|e| e.to_string())
}

/// Starts the pywal watcher once per app run. Best-effort: with no
/// ~/.cache/wal yet there is nothing to watch, and the read that follows
/// reports the real problem.
fn ensure_pywal_watcher(app: &AppHandle, watch: &State<'_, ThemeWatchState>, path: &Path) {
    let Ok(mut guard) = watch.pywal.lock() else {
        return;
    };
    if guard.is_some() {
        return;
    }
    let emitter = app.clone();
    let started = ThemeWatcher::start(path, move || {
        let payload = ThemeChangedPayload {
            source: "pywal".to_string(),
        };
        let _ = emitter.emit(THEME_CHANGED_EVENT, payload);
    });
    if let Ok(watcher) = started {
        *guard = Some(watcher);
    }
}

/// A JSON frontmatter object from the webview as the YAML mapping the vault
/// core writes. Null counts as empty; anything else isn't frontmatter.
fn json_to_mapping(frontmatter: &serde_json::Value) -> Result<serde_yaml::Mapping, String> {
    match serde_yaml::to_value(frontmatter) {
        Ok(serde_yaml::Value::Mapping(m)) => Ok(m),
        Ok(serde_yaml::Value::Null) => Ok(serde_yaml::Mapping::new()),
        Ok(_) => Err("frontmatter must be an object".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

fn with_vault<T>(
    state: &State<'_, VaultState>,
    f: impl FnOnce(&Vault) -> Result<T, String>,
) -> Result<T, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let open = guard.as_ref().ok_or("no vault is open")?;
    f(&open.vault)
}

/// Opens the vault, starts its watcher (forwarding events to the webview),
/// stores it as the active vault, and remembers it in the app config.
fn install_vault(
    app: &AppHandle,
    state: &State<'_, VaultState>,
    path: &PathBuf,
) -> Result<VaultInfo, String> {
    let vault = Vault::open(path).map_err(|e| e.to_string())?;
    let root = vault.root().to_path_buf();

    let (watcher, rx) = VaultWatcher::start(&root).map_err(|e| e.to_string())?;
    let emitter = app.clone();
    std::thread::spawn(move || {
        while let Ok(event) = rx.recv() {
            let _ = emitter.emit(VAULT_CHANGED_EVENT, VaultChangedPayload { paths: event.paths });
        }
    });

    *state.0.lock().map_err(|e| e.to_string())? = Some(OpenVault {
        vault,
        _watcher: watcher,
    });

    if let Some(dir) = AppConfig::default_dir() {
        let mut cfg = AppConfig::load_from(&dir).unwrap_or_default();
        cfg.set_and_remember_vault(&root);
        // Remembering the vault is best-effort; failing to write config
        // must not block opening it.
        let _ = cfg.save_to(&dir);
    }

    Ok(VaultInfo { root })
}
