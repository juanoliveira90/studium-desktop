//! Vault core: all filesystem access for the markdown vault lives here.
//! Parsing preserves files byte-for-byte, writes are atomic and only ever
//! rewrite frontmatter, and a debounced watcher surfaces hand-edits.

mod atomic;
mod error;
mod frontmatter;
#[allow(clippy::module_inception)]
mod vault;
mod watcher;

pub use atomic::atomic_write;
pub use error::VaultError;
pub use frontmatter::Document;
pub use vault::Vault;
pub use watcher::{VaultEvent, VaultWatcher};
