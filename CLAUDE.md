# studium-desktop

Local-first desktop version of Studium (github.com/juanoliveira90/studium): a study dashboard with a weekly schedule, study plans, and notes. No database — all data is plain markdown with YAML frontmatter in a user-chosen Obsidian-style vault. Tauri 2 shell (Rust owns all filesystem/vault I/O) with a React + TypeScript + Vite frontend. User-friendly monospace aesthetic: top navigation bar with centered page icons, sharp corners, Solarized Light as the default theme, fully keyboard-driven, themable via CSS variables (pywal/base16 + user CSS).

Full architecture, vault format, and implementation roadmap: `docs/initialPlan.md`. Visual reference: `docs/ReferenceImage.md`.

## Structure

```
src/                    React frontend
  main.tsx              entry; imports bundled JetBrains Mono (@fontsource) + the style layers in order
  App.tsx               page shell: active-page state + Alt+1..4 keymap + top navigation bar
  styles/tokens.css     theme API — every color/font/spacing as CSS vars; themes override only these
  styles/base.css       reset + global element styles
  styles/app.css        all layout/page styling
  components/           shared chrome (Page, TopBar — page icons + config gear, icons.tsx SVG set) + ContextMenu (right-click delete menu) / useContextMenu + AddRow ("+ new <thing>" row)
  keyboard/             keymap combo matching + useKeymap window listener (seed of the command registry)
  config/               config modal (sidebar sections: vault, customization) + uiSettings — bar position (top/bottom/left/right, via data-bar-position on .app) and show-labels toggle, persisted in localStorage
  vault/                ipc.ts — typed invoke layer (the only module importing Tauri APIs, incl. the plugin-dialog folder picker) + useVault open/create/known-list/forget/delete hooks + shared VaultGate + VaultSection (vault switcher inside the config modal)
  notes/                notes module: note.ts domain model + fuzzy finder, useNotes query/mutation hooks, CodeMirror Editor + livePreview.ts (Obsidian-style live preview decorations; Ctrl+E / header button toggles live↔raw, persisted in localStorage)
  schedule/             schedule module: block.ts domain model (schedule.md entries → grid placement, plan colors) + useSchedule hook
  plans/                plans module: plan.ts domain model (plans/ tree → plans/subjects/subtasks, progress) + usePlans query/mutation hooks + SubjectChecklist (toggle/delete task checklist, minimizable via its heading — persisted in localStorage, shared with home)
  theming/              theming module: builtins.ts (12 built-in palettes over the tokens.css color vars) + ipc.ts (theming invoke layer: snippets, pywal, base16 + theme:changed) + inject.ts (runtime <style> layers: theme vars, then user CSS snippets) + color.ts/mapPalette.ts (hex blending, pywal/base16 → token mapping) + themeSettings.tsx (selection + enabled snippets, localStorage) + useSnippets.ts (TanStack queries under ["theme", ...]) + ThemeVarsLayer/ThemeSnippetLayer (app-shell layers owning the injected styles) + ThemesSection (config modal: theme picker, base16 path, snippet toggles)
  home/                 home module: today.ts — pure aggregation over schedule + plans data (today's subjects + tasks, up next, clock helpers)
  data/                 format.ts — shared date display formatting for the vault's ISO dates
  pages/                one page per feature (Home, Notes, Plans, Schedule) + pages.ts registry
src-tauri/              Rust shell
  src/vault/            vault core: frontmatter round-trip, atomic writes, open/create/list/read/write, notify watcher, theme snippet list/read (.studium/themes/*.css)
  src/theme/            theme sources: pywal colors.json + base16 yaml readers, single-file ThemeWatcher (parent-dir watch survives rename-replace)
  src/config.rs         app config (~/.config/studium/config.toml — current vault path, known-vaults list, optional base16_path)
  src/commands.rs       Tauri invoke surface (vault_open/create/list_known/forget/delete, doc_list/read/write/delete, schedule_list/add/update/delete, theme_list/read_snippets, theme_read_pywal/base16, config_get/set_base16_path) + vault:changed and theme:changed events
  tests/vault_core.rs   integration + property tests for all of the above
  tests/theme_core.rs   pywal/base16 parsing + theme watcher tests
sample-vault/           vault fixture in the final format — Rust test data; replaces page mock data as modules land
docs/                   initialPlan.md (source of truth), ReferenceImage.md, futureIdeas.md (deferred features), adr/ (architecture decision records)
install.sh              user-level install/update: tauri build + binary/icon/desktop entry into ~/.local (see README)
```

## Commands

Node lives at `~/.local/opt/node/bin` if not on PATH (until installed via pacman).

```sh
npm install                 # install frontend deps (once, or after package.json changes)
npm run dev                 # Vite dev server only, http://localhost:1420 (works without Rust toolchain)
npm run build               # typecheck (tsc) + production frontend build — the quick CI-style check
npm run preview             # serve the production build locally
npm run lint                # ESLint over the frontend (flat config, eslint.config.js)
npm run lint:rust           # Clippy over the Rust shell (all targets, -D warnings)
npm test                    # Vitest run (frontend unit/component tests)
npm run test:watch          # Vitest in watch mode
npm run tauri dev           # full desktop app with hot reload (needs Rust + webkit2gtk, see README)
npm run tauri build         # release binary + packages in src-tauri/target/release/
cargo test                  # Rust tests — run from src-tauri/
```

## Conventions

- Hand-rolled CSS on the token layer only — no UI kit; new colors/spacing become tokens in `tokens.css`, never hardcoded values.
- Every page (notes, schedule, plans, home — steps 3–6) reads the real vault via TanStack Query over the `src/vault/ipc.ts` invoke layer; components never call `@tauri-apps/api` directly, and tests mock `ipc.ts` instead of the webview.
- TDD on both sides — tests first, implementation until green:
  - Rust (vault core, Tauri commands): happy paths plus edge cases (malformed frontmatter, dangling links, concurrent hand-edits). Writes must preserve markdown bodies and be atomic.
  - Frontend (components, domain logic): Vitest + React Testing Library (`npm test`); tests live next to the code as `*.test.tsx`, jsdom environment, setup in `src/test/setup.ts`.
- Verify frontend with `npm run lint`, `npm test`, and `npm run build` (tsc + vite); verify Rust with `cargo test` and `npm run lint:rust` (Clippy, warnings are errors). Running the app needs the Tauri Linux system libs (see README).


## Rules

### Do
- After every update, check the docs to see if there is something out of date. If there is, update it.
- Break long chained expressions into named intermediate variables — one responsibility per line (e.g. bind a `fs::read_to_string` result before `map_err`-ing it, name a boolean before branching on it) instead of stacking calls, combinators, and error mapping into one line.
- When a chain reads better unbroken (an intermediate variable would just make the reader jump away and back), keep the chain but break the line before each `.method()`:

  ```rust
  let dur = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or(std::time::Duration::ZERO);
  ```

- Run regression tests after every code update. A new feature, refactor, or any update should not break any other test.
- Care about alignment in every layout. Never give a container a fixed width/height without checking it fits its longest real content at the mono font metrics (~9px per character at `--fs`); prefer sizing to content. Text must never overflow its highlight/background box, and labels in a column must not wrap (wrapped lines re-center and break the shared left edge) — `white-space: nowrap` plus a container that actually fits.
### Don't
- Don't remove a test just because it's not passing (unless changed core logic)
- Don't make a commit if something is broken; each commit should be "production-ready"
- Don't make any changes if something is unclear; ALWAYS ask first.
- Unless you are explicitly told to do so, do not create a different git worktree for each feature. It's a small project, no need to do that.
- When you get asked a question, don't go out editing files. Consider that the user wants an answer only.
