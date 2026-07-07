//! The vault itself: an Obsidian-style directory the app owns no lock on.
//! Everything is addressed by vault-relative paths; anything that would
//! resolve outside the root is rejected before touching the filesystem.

use std::fs;
use std::path::{Component, Path, PathBuf};

use super::atomic::atomic_write;
use super::error::VaultError;
use super::frontmatter::Document;

const MARKER_DIR: &str = ".studium";

const DEFAULT_VAULT_CONFIG: &str = "\
# studium vault-local settings (theme, keybind overrides)
";

pub struct Vault {
    root: PathBuf,
}

impl Vault {
    /// Scaffolds the vault layout at `path` (creating it if needed) and opens
    /// it. Idempotent: existing files are never overwritten, so re-running
    /// create on a live vault is safe.
    pub fn create(path: impl AsRef<Path>) -> Result<Vault, VaultError> {
        let path = path.as_ref();
        for dir in ["notes", "plans", ".studium/themes"] {
            let dir = path.join(dir);
            fs::create_dir_all(&dir).map_err(|e| VaultError::io(&dir, e))?;
        }
        let schedule = path.join("schedule.md");
        if !schedule.exists() {
            atomic_write(&schedule, "")?;
        }
        let config = path.join(MARKER_DIR).join("config.toml");
        if !config.exists() {
            atomic_write(&config, DEFAULT_VAULT_CONFIG)?;
        }
        Vault::open(path)
    }

    /// Opens an existing vault; a directory without `.studium/` is not one.
    pub fn open(path: impl AsRef<Path>) -> Result<Vault, VaultError> {
        let path = path.as_ref();
        if !path.join(MARKER_DIR).is_dir() {
            return Err(VaultError::NotAVault {
                path: path.display().to_string(),
            });
        }
        let root = path.canonicalize().map_err(|e| VaultError::io(path, e))?;
        Ok(Vault { root })
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    /// All `.md` files under `rel_dir` (`""` for the whole vault), recursive,
    /// as sorted vault-relative paths. Hidden files and directories —
    /// including `.studium/` — are skipped.
    pub fn list(&self, rel_dir: &str) -> Result<Vec<String>, VaultError> {
        let dir = self.resolve(rel_dir)?;
        let mut paths = Vec::new();
        if dir.is_dir() {
            self.collect_markdown(&dir, &mut paths)?;
        }
        paths.sort();
        Ok(paths)
    }

    pub fn read(&self, rel_path: &str) -> Result<Document, VaultError> {
        let path = self.resolve(rel_path)?;
        let raw = fs::read_to_string(&path)
            .map_err(|err| VaultError::io(&path, err))?;
        Ok(Document::parse(&raw))
    }

    /// Reads a multi-entry file (`schedule.md`) as one document per
    /// frontmatter block. See [`Document::parse_all`].
    pub fn read_all(&self, rel_path: &str) -> Result<Vec<Document>, VaultError> {
        let path = self.resolve(rel_path)?;
        let raw = fs::read_to_string(&path)
            .map_err(|err| VaultError::io(&path, err))?;
        Ok(Document::parse_all(&raw))
    }

    /// Writes atomically, creating parent directories as needed.
    pub fn write(&self, rel_path: &str, doc: &Document) -> Result<(), VaultError> {
        let path = self.resolve(rel_path)?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| VaultError::io(parent, e))?;
        }
        atomic_write(&path, &doc.to_string())
    }

    fn resolve(&self, rel: &str) -> Result<PathBuf, VaultError> {
        let rel_path = Path::new(rel);
        let escapes = rel_path
            .components()
            .any(|c| !matches!(c, Component::Normal(_) | Component::CurDir));
        if escapes {
            return Err(VaultError::InvalidPath {
                path: rel.to_string(),
            });
        }
        Ok(self.root.join(rel_path))
    }

    fn collect_markdown(&self, dir: &Path, out: &mut Vec<String>) -> Result<(), VaultError> {
        let entries = fs::read_dir(dir).map_err(|e| VaultError::io(dir, e))?;
        for entry in entries {
            let entry = entry.map_err(|e| VaultError::io(dir, e))?;
            let name = entry.file_name();
            if name.to_string_lossy().starts_with('.') {
                continue;
            }
            let path = entry.path();
            if path.is_dir() {
                self.collect_markdown(&path, out)?;
            } else if path.extension().is_some_and(|ext| ext == "md") {
                if let Ok(rel) = path.strip_prefix(&self.root) {
                    out.push(rel.to_string_lossy().into_owned());
                }
            }
        }
        Ok(())
    }
}
