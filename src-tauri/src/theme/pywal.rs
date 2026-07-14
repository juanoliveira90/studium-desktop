//! Reader for pywal's generated palette (`~/.cache/wal/colors.json`).
//! The frontend maps the raw palette onto the CSS token variables.

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use super::error::ThemeError;

/// The 16 terminal colors plus specials from one pywal run.
#[derive(Debug, Serialize)]
pub struct PywalPalette {
    pub background: String,
    pub foreground: String,
    pub cursor: String,
    /// `color0`..`color15`, in order.
    pub colors: Vec<String>,
}

/// Where pywal writes its palette (`~/.cache/wal/colors.json`).
pub fn default_pywal_path() -> Option<PathBuf> {
    let cache_dir = dirs::cache_dir()?;
    Some(cache_dir.join("wal/colors.json"))
}

pub fn read_pywal(path: &Path) -> Result<PywalPalette, ThemeError> {
    let raw = fs::read_to_string(path).map_err(|e| ThemeError::io(path, e))?;
    let json: serde_json::Value =
        serde_json::from_str(&raw).map_err(|e| ThemeError::parse(path, e.to_string()))?;

    let special = json
        .get("special")
        .ok_or_else(|| ThemeError::parse(path, "missing \"special\" object"))?;
    let special_color = |key: &str| -> Result<String, ThemeError> {
        let value = special.get(key).and_then(|v| v.as_str());
        let color = value.ok_or_else(|| ThemeError::parse(path, format!("missing special.{key}")))?;
        Ok(color.to_string())
    };

    let color_table = json
        .get("colors")
        .ok_or_else(|| ThemeError::parse(path, "missing \"colors\" object"))?;
    let mut colors = Vec::with_capacity(16);
    for i in 0..16 {
        let key = format!("color{i}");
        let value = color_table.get(&key).and_then(|v| v.as_str());
        let color = value.ok_or_else(|| ThemeError::parse(path, format!("missing colors.{key}")))?;
        colors.push(color.to_string());
    }

    Ok(PywalPalette {
        background: special_color("background")?,
        foreground: special_color("foreground")?,
        cursor: special_color("cursor")?,
        colors,
    })
}
