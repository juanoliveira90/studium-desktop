//! Reader for base16 scheme files (the yaml path set in the app config).
//! Supports the modern tinted-theming layout (`palette: { base00: … }`)
//! and the legacy one with `base00..base0F` at the top level; hex values
//! may come with or without `#` and are normalized to `#`-prefixed.

use std::fs;
use std::path::Path;

use serde::Serialize;

use super::error::ThemeError;

/// The 16 scheme colors, `base00`..`base0F` in order, `#`-prefixed.
#[derive(Debug, Serialize)]
pub struct Base16Palette {
    pub palette: Vec<String>,
}

pub fn read_base16(path: &Path) -> Result<Base16Palette, ThemeError> {
    let raw = fs::read_to_string(path).map_err(|e| ThemeError::io(path, e))?;
    let yaml: serde_yaml::Value =
        serde_yaml::from_str(&raw).map_err(|e| ThemeError::parse(path, e.to_string()))?;

    // Modern schemes nest the colors under `palette:`; legacy ones put the
    // base00..base0F keys at the top level.
    let slot_table = yaml.get("palette").unwrap_or(&yaml);

    let mut palette = Vec::with_capacity(16);
    for i in 0..16 {
        let slot = format!("base{i:02X}");
        let value = slot_table
            .get(&slot)
            .or_else(|| slot_table.get(slot.to_lowercase()))
            .and_then(|v| v.as_str());
        let hex = value.ok_or_else(|| ThemeError::parse(path, format!("missing {slot}")))?;
        palette.push(normalize_hex(hex));
    }
    Ok(Base16Palette { palette })
}

fn normalize_hex(hex: &str) -> String {
    if hex.starts_with('#') {
        hex.to_string()
    } else {
        format!("#{hex}")
    }
}
