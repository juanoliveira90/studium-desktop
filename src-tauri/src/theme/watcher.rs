//! Debounced watcher over a single theme file (pywal's colors.json or a
//! base16 yaml). Watches the file's parent directory non-recursively:
//! generators replace the file via temp-file + rename, and a watch on the
//! path itself would die with the old inode.

use std::path::Path;
use std::time::Duration;

use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};

use super::error::ThemeError;

const DEBOUNCE: Duration = Duration::from_millis(200);

pub struct ThemeWatcher {
    // Held only to keep the watcher alive; dropping stops watching.
    _debouncer: Debouncer<notify::RecommendedWatcher>,
}

impl ThemeWatcher {
    /// Calls `on_change` (debounced) whenever `file` is written or replaced.
    pub fn start(
        file: &Path,
        on_change: impl Fn() + Send + 'static,
    ) -> Result<ThemeWatcher, ThemeError> {
        let parent = file
            .parent()
            .ok_or_else(|| ThemeError::Watcher {
                message: format!("{} has no parent directory", file.display()),
            })?
            .to_path_buf();
        let target_name = file
            .file_name()
            .ok_or_else(|| ThemeError::Watcher {
                message: format!("{} has no file name", file.display()),
            })?
            .to_os_string();

        let mut debouncer = new_debouncer(DEBOUNCE, move |result: DebounceEventResult| {
            let Ok(events) = result else { return };
            let touches_target = events
                .iter()
                .any(|event| event.path.file_name() == Some(target_name.as_os_str()));
            if touches_target {
                on_change();
            }
        })
        .map_err(|e| ThemeError::Watcher {
            message: e.to_string(),
        })?;

        debouncer
            .watcher()
            .watch(&parent, RecursiveMode::NonRecursive)
            .map_err(|e| ThemeError::Watcher {
                message: e.to_string(),
            })?;

        Ok(ThemeWatcher {
            _debouncer: debouncer,
        })
    }
}
