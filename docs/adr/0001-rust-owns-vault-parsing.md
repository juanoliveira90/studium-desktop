# 0001 — parse the vault in Rust, not in the frontend

2026-07-07

Question I'll forget the answer to: why does the frontend get JSON from
Tauri commands instead of just reading the .md files itself with a JS yaml
lib?

## The short version

Rust reads and parses everything under `src-tauri/src/vault/`. The frontend
only calls commands (`doc_read`, `schedule_list`, ...) via `src/vault/ipc.ts`
and gets parsed JSON back. The frontend still decides what the data *means*
(`block.ts` checks days/times) — Rust does bytes → data, TS does data →
meaning.

## Why

- **Two yaml parsers will disagree eventually.** YAML is cursed: `09:30` is
  the number 570 in YAML 1.1, `no` is `false`, every lib quotes differently.
  Writes have to go through Rust anyway (a webview can't do atomic
  temp+rename), so reading from JS would mean writing with one parser and
  reading with another. One parser = the round-trip guarantees (byte-identical
  files, quoted times) live and get tested in exactly one place.
- **The webview shouldn't be able to touch my files.** It renders note bodies
  and later user CSS themes, so it's the sketchy layer. Right now it can only
  ask for specific things through commands (with path-traversal checks in
  vault.rs). Giving it fs permissions to read md files directly would throw
  that away.
- **Watcher, reads and writes stay in one layer**, so live-reload can't drift
  from what a read returns.
- Bonus: no yaml lib in the JS bundle, and cargo/proptest tests are way
  cheaper than jsdom ones.

## The cost

Every new file shape needs a new Tauri command (schedule.md needed
`schedule_list`). Fine — the commands mirror the web app's fetch layer
anyway, so ports stay mechanical. Also everything crosses to the frontend as
JSON because that's what Tauri speaks and what JS parses natively; weird YAML
that JSON can't hold (non-string keys) just errors instead of getting
silently mangled.
