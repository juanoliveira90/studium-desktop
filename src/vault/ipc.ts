/*
 * Typed wrappers over the Tauri invoke surface from src-tauri/src/commands.rs.
 * This is the only module that talks to `@tauri-apps/api`; everything else
 * (hooks, pages) depends on these functions, so tests mock this module and
 * never need a webview.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

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

/** Every vault the user has opened, per the app config. */
export function vaultListKnown(): Promise<string[]> {
  return invoke("vault_list_known");
}

/** Forgets a vault (files stay on disk); returns the updated known list. */
export function vaultForget(path: string): Promise<string[]> {
  return invoke("vault_forget", { path });
}

/** Deletes a vault's files from disk; returns the updated known list. */
export function vaultDelete(path: string): Promise<string[]> {
  return invoke("vault_delete", { path });
}

/** Native folder picker; resolves to null when the user cancels. */
export async function pickFolder(): Promise<string | null> {
  const selection = await openDialog({ directory: true });
  return typeof selection === "string" ? selection : null;
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

/**
 * Deletes a file or directory (recursively) at a vault-relative path — a
 * note or subject file, or a whole `plans/<slug>` directory.
 */
export function docDelete(path: string): Promise<void> {
  return invoke("doc_delete", { path });
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

/** Appends one event block to schedule.md. */
export function scheduleAdd(frontmatter: Record<string, unknown>): Promise<void> {
  return invoke("schedule_add", { frontmatter });
}

/** Replaces the frontmatter of the index-th block of schedule.md (the
 *  position in scheduleList's result); other blocks are untouched. */
export function scheduleUpdate(
  index: number,
  frontmatter: Record<string, unknown>,
): Promise<void> {
  return invoke("schedule_update", { index, frontmatter });
}

/** Removes the index-th block of schedule.md. */
export function scheduleDelete(index: number): Promise<void> {
  return invoke("schedule_delete", { index });
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
