use std::path::Path;

/// Every failure mode of the vault layer. Commands surface these to the
/// frontend as strings; nothing in the vault core panics on bad input.
#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("{path}: {source}")]
    Io {
        path: String,
        #[source]
        source: std::io::Error,
    },

    #[error("invalid frontmatter: {message}")]
    Frontmatter { message: String },

    #[error("not a studium vault (missing .studium/): {path}")]
    NotAVault { path: String },

    #[error("path escapes the vault: {path}")]
    InvalidPath { path: String },

    #[error("config error: {message}")]
    Config { message: String },

    #[error("watcher error: {message}")]
    Watcher { message: String },
}

impl VaultError {
    pub(crate) fn io(path: &Path, source: std::io::Error) -> Self {
        VaultError::Io {
            path: path.display().to_string(),
            source,
        }
    }
}
