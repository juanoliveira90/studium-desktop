use std::path::Path;

/// Failure modes of the theme sources. Commands surface these to the
/// frontend as strings, where they become the inline error line of the
/// themes config section.
#[derive(Debug, thiserror::Error)]
pub enum ThemeError {
    #[error("{path}: {source}")]
    Io {
        path: String,
        #[source]
        source: std::io::Error,
    },

    #[error("malformed {path}: {message}")]
    Parse { path: String, message: String },

    #[error("watcher error: {message}")]
    Watcher { message: String },
}

impl ThemeError {
    pub(crate) fn io(path: &Path, source: std::io::Error) -> Self {
        ThemeError::Io {
            path: path.display().to_string(),
            source,
        }
    }

    pub(crate) fn parse(path: &Path, message: impl Into<String>) -> Self {
        ThemeError::Parse {
            path: path.display().to_string(),
            message: message.into(),
        }
    }
}
