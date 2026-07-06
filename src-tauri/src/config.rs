//! App-level config at `~/.config/studium/config.toml` — currently just the
//! remembered vault path. Directory-injectable so tests never touch the real
//! home.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::vault::{atomic_write, VaultError};

const CONFIG_FILE: &str = "config.toml";

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vault_path: Option<PathBuf>,
}

impl AppConfig {
    /// The real config directory (`~/.config/studium`), when resolvable.
    pub fn default_dir() -> Option<PathBuf> {
        dirs::config_dir().map(|dir| dir.join("studium"))
    }

    /// Loads from `dir/config.toml`; a missing file is the default config.
    pub fn load_from(dir: &Path) -> Result<AppConfig, VaultError> {
        let path = dir.join(CONFIG_FILE);
        let raw = match fs::read_to_string(&path) {
            Ok(raw) => raw,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                return Ok(AppConfig::default())
            }
            Err(e) => return Err(VaultError::io(&path, e)),
        };
        toml::from_str(&raw).map_err(|e| VaultError::Config {
            message: format!("{}: {e}", path.display()),
        })
    }

    pub fn save_to(&self, dir: &Path) -> Result<(), VaultError> {
        fs::create_dir_all(dir).map_err(|e| VaultError::io(dir, e))?;
        let raw = toml::to_string_pretty(self).map_err(|e| VaultError::Config {
            message: e.to_string(),
        })?;
        atomic_write(&dir.join(CONFIG_FILE), &raw)
    }
}
