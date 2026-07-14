//! Tests for the theme sources: pywal colors.json parsing and the
//! single-file theme watcher.

use std::fs;
use std::sync::mpsc;
use std::time::Duration;

use studium_desktop_lib::theme::{read_base16, read_pywal, ThemeError, ThemeWatcher};

fn sample_colors_json() -> String {
    let colors: Vec<String> = (0..16)
        .map(|i| format!("\"color{i}\": \"#0000{i:02x}\""))
        .collect();
    format!(
        r##"{{
  "wallpaper": "/home/u/pic.png",
  "special": {{
    "background": "#1d2021",
    "foreground": "#ebdbb2",
    "cursor": "#ebdbb2"
  }},
  "colors": {{ {} }}
}}"##,
        colors.join(", ")
    )
}

#[test]
fn read_pywal_parses_specials_and_all_16_colors_in_order() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("colors.json");
    fs::write(&path, sample_colors_json()).unwrap();

    let palette = read_pywal(&path).unwrap();
    assert_eq!(palette.background, "#1d2021");
    assert_eq!(palette.foreground, "#ebdbb2");
    assert_eq!(palette.cursor, "#ebdbb2");
    assert_eq!(palette.colors.len(), 16);
    assert_eq!(palette.colors[0], "#000000");
    assert_eq!(palette.colors[15], "#00000f");
}

#[test]
fn read_pywal_missing_file_is_io_error() {
    let dir = tempfile::tempdir().unwrap();
    let result = read_pywal(&dir.path().join("colors.json"));
    assert!(matches!(result, Err(ThemeError::Io { .. })));
}

#[test]
fn read_pywal_malformed_json_is_parse_error() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("colors.json");
    fs::write(&path, "not json {").unwrap();

    let result = read_pywal(&path);
    assert!(matches!(result, Err(ThemeError::Parse { .. })));
}

#[test]
fn read_pywal_missing_color_slot_is_parse_error() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("colors.json");
    let without_color7 = sample_colors_json().replace("\"color7\"", "\"colour7\"");
    fs::write(&path, without_color7).unwrap();

    let result = read_pywal(&path);
    assert!(matches!(result, Err(ThemeError::Parse { .. })));
}

#[test]
fn read_pywal_missing_special_is_parse_error() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("colors.json");
    let without_background = sample_colors_json().replace("\"background\"", "\"bg\"");
    fs::write(&path, without_background).unwrap();

    let result = read_pywal(&path);
    assert!(matches!(result, Err(ThemeError::Parse { .. })));
}

fn base16_slots() -> Vec<String> {
    (0..16).map(|i| format!("base{i:02X}")).collect()
}

#[test]
fn read_base16_parses_modern_palette_layout() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("scheme.yaml");
    let entries: Vec<String> = base16_slots()
        .iter()
        .enumerate()
        .map(|(i, slot)| format!("  {slot}: \"{i:02x}{i:02x}{i:02x}\""))
        .collect();
    let yaml = format!(
        "system: base16\nname: test\npalette:\n{}\n",
        entries.join("\n")
    );
    fs::write(&path, yaml).unwrap();

    let palette = read_base16(&path).unwrap();
    assert_eq!(palette.palette.len(), 16);
    assert_eq!(palette.palette[0], "#000000");
    assert_eq!(palette.palette[15], "#0f0f0f");
}

#[test]
fn read_base16_parses_legacy_top_level_layout_and_keeps_hash() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("scheme.yaml");
    let entries: Vec<String> = base16_slots()
        .iter()
        .enumerate()
        .map(|(i, slot)| format!("{slot}: \"#a0a0{i:02x}\""))
        .collect();
    fs::write(&path, format!("scheme: legacy\n{}\n", entries.join("\n"))).unwrap();

    let palette = read_base16(&path).unwrap();
    assert_eq!(palette.palette[1], "#a0a001");
    assert_eq!(palette.palette[10], "#a0a00a");
}

#[test]
fn read_base16_missing_slot_is_parse_error() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("scheme.yaml");
    fs::write(&path, "palette:\n  base00: \"111111\"\n").unwrap();

    assert!(matches!(read_base16(&path), Err(ThemeError::Parse { .. })));
}

#[test]
fn read_base16_malformed_yaml_is_parse_error() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("scheme.yaml");
    fs::write(&path, ": not yaml : [").unwrap();

    assert!(matches!(read_base16(&path), Err(ThemeError::Parse { .. })));
}

#[test]
fn read_base16_missing_file_is_io_error() {
    let dir = tempfile::tempdir().unwrap();
    let result = read_base16(&dir.path().join("scheme.yaml"));
    assert!(matches!(result, Err(ThemeError::Io { .. })));
}

/// Waits until `rx` has received at least one notification or 5s pass.
fn fired_within_deadline(rx: &mpsc::Receiver<()>) -> bool {
    rx.recv_timeout(Duration::from_secs(5)).is_ok()
}

#[test]
fn theme_watcher_fires_on_rewrite() {
    let dir = tempfile::tempdir().unwrap();
    let file = dir.path().join("colors.json");
    fs::write(&file, "v1").unwrap();

    let (tx, rx) = mpsc::channel();
    let watcher = ThemeWatcher::start(&file, move || {
        let _ = tx.send(());
    })
    .unwrap();
    std::thread::sleep(Duration::from_millis(200));

    fs::write(&file, "v2").unwrap();
    let fired = fired_within_deadline(&rx);
    drop(watcher);
    assert!(fired, "watcher did not fire on rewrite");
}

#[test]
fn theme_watcher_fires_when_file_is_replaced() {
    // wal and friends write a temp file and rename over the target; watching
    // the parent directory has to survive that.
    let dir = tempfile::tempdir().unwrap();
    let file = dir.path().join("colors.json");
    fs::write(&file, "v1").unwrap();

    let (tx, rx) = mpsc::channel();
    let watcher = ThemeWatcher::start(&file, move || {
        let _ = tx.send(());
    })
    .unwrap();
    std::thread::sleep(Duration::from_millis(200));

    let temp = dir.path().join("colors.json.new");
    fs::write(&temp, "v2").unwrap();
    fs::rename(&temp, &file).unwrap();
    let fired = fired_within_deadline(&rx);
    drop(watcher);
    assert!(fired, "watcher did not fire on rename-replace");
}

#[test]
fn theme_watcher_ignores_sibling_files() {
    let dir = tempfile::tempdir().unwrap();
    let file = dir.path().join("colors.json");
    fs::write(&file, "v1").unwrap();

    let (tx, rx) = mpsc::channel();
    let watcher = ThemeWatcher::start(&file, move || {
        let _ = tx.send(());
    })
    .unwrap();
    std::thread::sleep(Duration::from_millis(200));

    fs::write(dir.path().join("other.txt"), "noise").unwrap();
    let fired = rx.recv_timeout(Duration::from_millis(600)).is_ok();
    drop(watcher);
    assert!(!fired, "watcher fired for an unrelated sibling file");
}

#[test]
fn theme_watcher_missing_parent_errors() {
    let dir = tempfile::tempdir().unwrap();
    let file = dir.path().join("nope/colors.json");
    let result = ThemeWatcher::start(&file, || {});
    assert!(matches!(result, Err(ThemeError::Watcher { .. })));
}
