//! Debounced recursive watcher over the vault, so hand-edits in vim or
//! Obsidian show up in the app live. Events carry vault-relative paths;
//! hidden files (including our own atomic-write temp files) are filtered out.

use std::path::Path;
use std::sync::mpsc;
use std::time::Duration;

use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};

use super::error::VaultError;

const DEBOUNCE: Duration = Duration::from_millis(200);

#[derive(Debug, Clone)]
pub struct VaultEvent {
    /// Vault-relative paths that changed, deduplicated within one debounce
    /// window.
    pub paths: Vec<String>,
}

pub struct VaultWatcher {
    // Held only to keep the watcher alive; dropping stops watching.
    _debouncer: Debouncer<notify::RecommendedWatcher>,
}

impl VaultWatcher {
    pub fn start(root: &Path) -> Result<(VaultWatcher, mpsc::Receiver<VaultEvent>), VaultError> {
        let root = root.canonicalize().map_err(|e| VaultError::io(root, e))?;
        let (tx, rx) = mpsc::channel();
        let event_root = root.clone();
        let mut debouncer = new_debouncer(DEBOUNCE, move |result: DebounceEventResult| {
            let Ok(events) = result else { return };
            let mut paths: Vec<String> = events
                .iter()
                .filter_map(|event| {
                    let rel = event.path.strip_prefix(&event_root).ok()?;
                    let name = rel.file_name()?.to_string_lossy().into_owned();
                    if name.starts_with('.') {
                        return None;
                    }
                    Some(rel.to_string_lossy().into_owned())
                })
                .collect();
            paths.sort();
            paths.dedup();
            if !paths.is_empty() {
                let _ = tx.send(VaultEvent { paths });
            }
        })
        .map_err(|e| VaultError::Watcher {
            message: e.to_string(),
        })?;
        debouncer
            .watcher()
            .watch(&root, RecursiveMode::Recursive)
            .map_err(|e| VaultError::Watcher {
                message: e.to_string(),
            })?;
        Ok((VaultWatcher { _debouncer: debouncer }, rx))
    }
}
