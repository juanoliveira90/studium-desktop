//! The vault itself: an Obsidian-style directory the app owns no lock on.
//! Everything is addressed by vault-relative paths; anything that would
//! resolve outside the root is rejected before touching the filesystem.

use std::fs;
use std::path::{Component, Path, PathBuf};

use super::atomic::atomic_write;
use super::error::VaultError;
use super::frontmatter::Document;

const MARKER_DIR: &str = ".studium";
const THEMES_DIR: &str = ".studium/themes";

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

    /// Deletes the vault directory from disk. Routes through [`Vault::open`],
    /// so anything without the `.studium/` marker is refused — a typo can
    /// never remove an arbitrary directory.
    pub fn delete(path: impl AsRef<Path>) -> Result<(), VaultError> {
        let vault = Vault::open(path)?;
        fs::remove_dir_all(vault.root()).map_err(|e| VaultError::io(vault.root(), e))
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

    /// Writes a multi-entry file (`schedule.md`) back as one frontmatter
    /// block per document — the inverse of [`Vault::read_all`]. Documents
    /// that came from `read_all` and weren't edited serialize byte-identical
    /// (malformed blocks included); a newline is inserted between documents
    /// only when the previous one doesn't already end with one.
    pub fn write_all(&self, rel_path: &str, docs: &[Document]) -> Result<(), VaultError> {
        let path = self.resolve(rel_path)?;
        let mut contents = String::new();
        for doc in docs {
            let needs_separator = !contents.is_empty() && !contents.ends_with('\n');
            if needs_separator {
                contents.push('\n');
            }
            contents.push_str(&doc.to_string());
        }
        atomic_write(&path, &contents)
    }

    /// Removes a file or directory (recursively) at `rel_path`. Rejects
    /// paths that escape the root, like every other vault operation, and
    /// refuses an empty path so the vault root itself can never be removed.
    pub fn remove(&self, rel_path: &str) -> Result<(), VaultError> {
        if rel_path.trim().is_empty() {
            return Err(VaultError::InvalidPath {
                path: rel_path.to_string(),
            });
        }
        let path = self.resolve(rel_path)?;
        let removal = if path.is_dir() {
            fs::remove_dir_all(&path)
        } else {
            fs::remove_file(&path)
        };
        removal.map_err(|e| VaultError::io(&path, e))
    }

    /// The `.css` files in `.studium/themes/` (user theme snippets) as
    /// sorted file names. A vault without the directory has no snippets.
    pub fn list_theme_snippets(&self) -> Result<Vec<String>, VaultError> {
        let dir = self.root.join(THEMES_DIR);
        let mut names = Vec::new();
        if !dir.is_dir() {
            return Ok(names);
        }
        let entries = fs::read_dir(&dir).map_err(|e| VaultError::io(&dir, e))?;
        for entry in entries {
            let entry = entry.map_err(|e| VaultError::io(&dir, e))?;
            let path = entry.path();
            let is_css_file = path.is_file() && path.extension().is_some_and(|ext| ext == "css");
            if !is_css_file {
                continue;
            }
            if let Some(name) = path.file_name() {
                names.push(name.to_string_lossy().into_owned());
            }
        }
        names.sort();
        Ok(names)
    }

    /// The contents of one snippet by file name. Only a plain `<name>.css`
    /// inside `.studium/themes/` is accepted — separators and `..` are
    /// rejected before touching the filesystem, like every vault path.
    pub fn read_theme_snippet(&self, name: &str) -> Result<String, VaultError> {
        let name_path = Path::new(name);
        let mut components = name_path.components();
        let is_plain_name = matches!(components.next(), Some(Component::Normal(_)))
            && components.next().is_none();
        let is_css = name_path.extension().is_some_and(|ext| ext == "css");
        if !is_plain_name || !is_css {
            return Err(VaultError::InvalidPath {
                path: name.to_string(),
            });
        }
        let path = self.root.join(THEMES_DIR).join(name_path);
        fs::read_to_string(&path).map_err(|e| VaultError::io(&path, e))
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
