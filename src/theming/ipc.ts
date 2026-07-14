/*
 * Typed wrappers over the theming half of the Tauri invoke surface
 * (src-tauri/src/commands.rs). Like src/vault/ipc.ts, this is a module
 * tests mock so nothing else touches `@tauri-apps/api`.
 */

import { invoke } from "@tauri-apps/api/core";

/** File names of the `.css` snippets in the vault's `.studium/themes/`. */
export function themeListSnippets(): Promise<string[]> {
  return invoke("theme_list_snippets");
}

/** Contents of one snippet, read by Rust (the webview has no fs access). */
export function themeReadSnippet(name: string): Promise<string> {
  return invoke("theme_read_snippet", { name });
}
