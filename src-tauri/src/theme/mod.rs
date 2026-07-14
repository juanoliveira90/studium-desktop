//! Theme sources outside the vault: the pywal palette (~/.cache/wal) and
//! a watcher that re-emits when a theme file is rewritten, so `wal -i img`
//! retints the running app live.

mod error;
mod pywal;
mod watcher;

pub use error::ThemeError;
pub use pywal::{default_pywal_path, read_pywal, PywalPalette};
pub use watcher::ThemeWatcher;
