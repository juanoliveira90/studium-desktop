/*
 * Typed wrappers over the theming half of the Tauri invoke surface
 * (src-tauri/src/commands.rs). Like src/vault/ipc.ts, this is a module
 * tests mock so nothing else touches `@tauri-apps/api`.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

/** File names of the `.css` snippets in the vault's `.studium/themes/`. */
export function themeListSnippets(): Promise<string[]> {
  return invoke("theme_list_snippets");
}

/** Contents of one snippet, read by Rust (the webview has no fs access). */
export function themeReadSnippet(name: string): Promise<string> {
  return invoke("theme_read_snippet", { name });
}

/** Mirror of the Rust `PywalPalette`: specials + color0..15 in order. */
export interface PywalPalette {
  background: string;
  foreground: string;
  cursor: string;
  colors: string[];
}

/** The palette from ~/.cache/wal/colors.json; starts its watcher too. */
export function themeReadPywal(): Promise<PywalPalette> {
  return invoke("theme_read_pywal");
}

/** Mirror of the Rust `Base16Palette`: base00..base0F in order. */
export interface Base16Palette {
  palette: string[];
}

/** The scheme from the base16 yaml configured in the app config. */
export function themeReadBase16(): Promise<Base16Palette> {
  return invoke("theme_read_base16");
}

/** The configured base16 yaml path, if any. */
export function configGetBase16Path(): Promise<string | null> {
  return invoke("config_get_base16_path");
}

/** Sets (or clears, with null) the base16 yaml path and rewires its watcher. */
export function configSetBase16Path(path: string | null): Promise<void> {
  return invoke("config_set_base16_path", { path });
}

/**
 * Subscribes to the `theme:changed` watcher event (`source`: "pywal" |
 * "base16"). Returns an unsubscribe function, safe to call before listen
 * resolves.
 */
export function onThemeChanged(cb: (source: string) => void): () => void {
  let disposed = false;
  let unlisten: (() => void) | undefined;
  listen<{ source: string }>("theme:changed", (event) => {
    cb(event.payload.source);
  }).then((fn) => {
    if (disposed) fn();
    else unlisten = fn;
  });
  return () => {
    disposed = true;
    unlisten?.();
  };
}
