//! Theme sources outside the vault: the pywal palette (~/.cache/wal), a
//! configured base16 scheme yaml, and a watcher that re-emits when a theme
//! file is rewritten, so `wal -i img` (or a scheme edit) retints the
//! running app live.

mod base16;
mod error;
mod pywal;
mod watcher;

pub use base16::{read_base16, Base16Palette};
pub use error::ThemeError;
pub use pywal::{default_pywal_path, read_pywal, PywalPalette};
pub use watcher::ThemeWatcher;
