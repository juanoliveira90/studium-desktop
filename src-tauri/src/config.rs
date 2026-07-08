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
    /// Every vault the user has opened; `default` keeps old config files
    /// (which only had `vault_path`) loading unchanged.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub vaults: Vec<PathBuf>,
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

    /// The vault list plus a legacy `vault_path` not yet in it — the
    /// read-time migration for configs written before the list existed.
    /// Order-stable and deduped.
    pub fn known_vaults(&self) -> Vec<PathBuf> {
        let mut all = self.vaults.clone();
        if let Some(current) = &self.vault_path {
            let already_listed = all.contains(current);
            if !already_listed {
                all.push(current.clone());
            }
        }
        all
    }

    /// Sets `path` as the current vault and adds it to the known-vaults
    /// list if it isn't already there.
    pub fn set_and_remember_vault(&mut self, path: &Path) {
        let already_listed = self.vaults.iter().any(|v| v == path);
        if !already_listed {
            self.vaults.push(path.to_path_buf());
        }
        self.vault_path = Some(path.to_path_buf());
    }

    /// Removes `path` from the list; clears the current vault if it matches.
    pub fn forget_vault(&mut self, path: &Path) {
        self.vaults.retain(|v| v != path);
        let was_current = self.vault_path.as_deref() == Some(path);
        if was_current {
            self.vault_path = None;
        }
    }

    pub fn save_to(&self, dir: &Path) -> Result<(), VaultError> {
        fs::create_dir_all(dir).map_err(|e| VaultError::io(dir, e))?;
        let raw = toml::to_string_pretty(self).map_err(|e| VaultError::Config {
            message: e.to_string(),
        })?;
        atomic_write(&dir.join(CONFIG_FILE), &raw)
    }
}
