/*
 * Typed wrappers over the Tauri invoke surface from src-tauri/src/commands.rs.
 * This is the only module that talks to `@tauri-apps/api`; everything else
 * (hooks, pages) depends on these functions, so tests mock this module and
 * never need a webview.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

/** Mirror of the Rust `DocPayload` in commands.rs. */
export interface DocPayload {
  path: string;
  frontmatter: Record<string, unknown>;
  /** Set when the file's YAML is malformed; `frontmatter` is then empty. */
  frontmatter_error: string | null;
  body: string;
}

export interface VaultInfo {
  root: string;
}

/** The vault remembered in ~/.config/studium/config.toml, if any. */
export function vaultDefaultPath(): Promise<string | null> {
  return invoke("vault_default_path");
}

export function vaultOpen(path: string): Promise<VaultInfo> {
  return invoke("vault_open", { path });
}

export function vaultCreate(path: string): Promise<VaultInfo> {
  return invoke("vault_create", { path });
}

/** Vault-relative paths of every markdown file under `dir`, sorted. */
export function docList(dir: string): Promise<string[]> {
  return invoke("doc_list", { dir });
}

export function docRead(path: string): Promise<DocPayload> {
  return invoke("doc_read", { path });
}

export function docWrite(
  path: string,
  frontmatter: Record<string, unknown>,
  body: string,
): Promise<void> {
  return invoke("doc_write", { path, frontmatter, body });
}

/** Mirror of the Rust `ScheduleEntry`: one frontmatter block of schedule.md. */
export interface ScheduleEntry {
  frontmatter: Record<string, unknown>;
  /** Set when the block's YAML is malformed; `frontmatter` is then empty. */
  frontmatter_error: string | null;
}

/** The weekly schedule, one entry per block of schedule.md. */
export function scheduleList(): Promise<ScheduleEntry[]> {
  return invoke("schedule_list");
}

/**
 * Subscribes to the `vault:changed` watcher event. Returns an unsubscribe
 * function (safe to call before the underlying listen resolves).
 */
export function onVaultChanged(cb: (paths: string[]) => void): () => void {
  let disposed = false;
  let unlisten: (() => void) | undefined;
  listen<{ paths: string[] }>("vault:changed", (event) => {
    cb(event.payload.paths);
  }).then((fn) => {
    if (disposed) fn();
    else unlisten = fn;
  });
  return () => {
    disposed = true;
    unlisten?.();
  };
}
