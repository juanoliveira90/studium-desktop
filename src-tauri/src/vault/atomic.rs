//! Atomic file writes: content lands in a temp file in the target's
//! directory, is fsynced, then renamed over the destination. A crash or a
//! concurrent reader never observes a half-written file.

use std::io::Write;
use std::path::Path;

use super::error::VaultError;

pub fn atomic_write(path: &Path, contents: &str) -> Result<(), VaultError> {
    let parent = path.parent().filter(|p| !p.as_os_str().is_empty()).ok_or_else(|| {
        VaultError::InvalidPath {
            path: path.display().to_string(),
        }
    })?;
    let mut tmp = tempfile::Builder::new()
        .prefix(".studium-write-")
        .tempfile_in(parent)
        .map_err(|e| VaultError::io(path, e))?;
    tmp.write_all(contents.as_bytes())
        .map_err(|e| VaultError::io(path, e))?;
    tmp.as_file()
        .sync_all()
        .map_err(|e| VaultError::io(path, e))?;
    tmp.persist(path)
        .map_err(|e| VaultError::io(path, e.error))?;
    Ok(())
}
