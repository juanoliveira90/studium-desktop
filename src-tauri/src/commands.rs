//! Tauri commands: the thin `invoke` surface over the vault core. All logic
//! and error handling lives in `vault`/`config`; these functions only manage
//! the open-vault state, translate errors to strings, and forward watcher
//! events to the webview as `vault:changed`.

use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::config::AppConfig;
use crate::vault::{Document, Vault, VaultWatcher};

/// Event emitted to the frontend whenever files in the open vault change.
/// Payload: `{ paths: string[] }` with vault-relative paths.
pub const VAULT_CHANGED_EVENT: &str = "vault:changed";

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

#[derive(Serialize, Clone)]
struct VaultChangedPayload {
    paths: Vec<String>,
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
        let mapping = match serde_yaml::to_value(&frontmatter) {
            Ok(serde_yaml::Value::Mapping(m)) => m,
            Ok(serde_yaml::Value::Null) => serde_yaml::Mapping::new(),
            Ok(_) => return Err("frontmatter must be an object".to_string()),
            Err(e) => return Err(e.to_string()),
        };
        // Start from the on-disk file when it exists so a doc whose YAML we
        // couldn't parse still keeps its body semantics; body is replaced,
        // frontmatter regenerated.
        let mut doc = vault.read(&path).unwrap_or_else(|_| Document::parse(""));
        doc.set_frontmatter(mapping);
        doc.set_body(body);
        vault.write(&path, &doc).map_err(|e| e.to_string())
    })
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
        cfg.vault_path = Some(root.clone());
        // Remembering the vault is best-effort; failing to write config
        // must not block opening it.
        let _ = cfg.save_to(&dir);
    }

    Ok(VaultInfo { root })
}
