# Studium Desktop — Architecture & Tech Stack

## Context

Studium (github.com/juanoliveira90/studium) is a web productivity app for students: React/Vite frontend, Fastify + Postgres backend. Juan wants a desktop version at `/home/juan/Projects/studium-desktop` that is:

- **Local-first, no database** — an Obsidian-style vault in a user-chosen directory
- **The three core features**: weekly schedule, study plans (plans → subjects → subtasks), note taking
- **Fast and lightweight**, 100% keyboard-usable, user-friendly monospace aesthetic (top-bar navigation with icons, Solarized by default), themable like Obsidian/Linux apps

Decisions made with the user:

| Decision | Choice |
|---|---|
| Framework | **Tauri 2** (Rust core + webkitgtk webview) |
| Vault format | **All markdown + YAML frontmatter** (including schedule) |
| Keyboard model | **Non-modal chords, i3/emacs style** + command palette |
| Theming | **base16/pywal auto-detect + user CSS themes** in vault |

## Tech stack

- **Shell**: Tauri 2 (Rust). Rust side owns all filesystem access: vault I/O, frontmatter parsing (`gray_matter` or `serde_yaml` + manual split), file watching (`notify` crate), config.
- **Frontend**: React + TypeScript + Vite (same stack as web — port domain types and component logic from `apps/web`, but a fresh minimal UI, not the web look). No heavy UI kit: hand-rolled CSS on design tokens. Monospace font, sharp corners, top-bar navigation with icons — Solarized theme by default.
- **State**: TanStack Query against Tauri `invoke` commands (mirrors the web app's fetch layer, so porting is mechanical: `scheduleFetchs.ts` → `invoke("schedule_list")` etc.).
- **Markdown rendering/editing**: CodeMirror 6 for the note editor (lightweight, keyboard-first, used by Obsidian itself) with live-preview styling; `markdown-it` or CM6 decorations for rendering.
- **No backend, no auth, no i18n initially** (can port i18next later).

## Vault design

User picks/creates a vault directory on first run via the native folder picker (remembered in `~/.config/studium/config.toml`, which also keeps the list of every vault opened so far). The top bar's `⚙ vault` button opens a settings modal to create new vaults, switch between known ones, forget one (files stay on disk), or delete its files entirely (marker-validated, double-confirmed). Vault layout:

```
vault/
├── notes/
│   └── <note-title>.md            # plain markdown, frontmatter: created, updated, tags
├── plans/
│   └── calculus-ii/
│       ├── plan.md                # frontmatter: name, schedule_block link; body = description
│       └── subjects/
│           └── integrals.md       # frontmatter: tag, subtasks: [{name, done}]; body = description
├── schedule.md                    # weekly schedule, one entry per block
└── .studium/
    ├── config.toml                # vault-local settings (theme, keybind overrides)
    └── themes/
        └── *.css                  # user themes
```

- `schedule.md`: list of blocks with quoted time strings (`start: "09:30"`) in per-block frontmatter-style sections; each block has `day`/`start`/`end`/`title`, an optional free-text `description`, and links to plans via `[[plan-slug]]` wiki-links. Times always written quoted to dodge YAML coercion. Blocks are addressed by position: `schedule_add/update/delete` rewrite one block and keep every other block byte-identical (hand-edited or malformed ones included).
- Relations use directory/file slugs (rename = re-link; Rust side validates and reports dangling links rather than crashing).
- App writes must preserve markdown bodies untouched; only frontmatter is rewritten, keys in stable order.
- File watcher on the vault so hand-edits in vim/Obsidian appear live in the app.
- Atomic writes (write temp + rename) to avoid corrupting files.

## UI design (see docs/ReferenceImage.md)

The app is **page-per-feature** — one full-window page per section, switched entirely by keyboard (this supersedes the reference image's 2×2 tiled layout; the content of each page stays true to its pane in the reference):

- **Pages**: **home** (`alt+1` — logo/tagline, "today" checklist with durations, "today's events" from the schedule, "up next" derived from the next upcoming block); **notes** (`alt+2` — search line, tag filter tabs `all/book/lecture/idea/personal`, note list with dates, `+ new note`); **study plan** (`alt+3` — `active/upcoming/archive` tabs, plans with date range, thin progress bar + percentage, `+ new plan`); **weekly routine** (`alt+4` — the recurring weekly routine from `schedule.md`: hour rows 08:00–22:00 on a half-hour grid, weekday columns, blocks colored by their linked plan; no week nav since the schedule is a repeating template, not dated weeks; `+ new event` form below the grid, click a block to edit it, right-click → delete with confirm).
- **Page chrome**: each page has a lowercase title with its keybinding hinted in the corner (`notes (alt+2)`) — keybindings are discoverable from the UI itself.
- **Top bar**: a navigation bar docked at the top lists the pages as centered icon + label buttons (keybindings shown in the hover tooltip) and highlights the active one with an accent underline; the `⚙ vault` settings button sits pinned at its right edge. Items are clickable and `Alt+1..4` remains the fast path.
- **Visual language**: monospace font throughout, sharp corners, 1px borders, text-only tabs (active = filled block), unicode checkboxes (`☑/☐`), thin line progress bars, Solarized Light base with its blue accent by default (must derive entirely from the CSS variable theme layer so pywal retints everything).

Data-model implications from the reference:

- **Notes carry tags** (frontmatter `tags:`) driving the filter tabs.
- **Plans have a date range and computed progress** — `start`/`end` in `plan.md` frontmatter; progress % computed from subject subtasks `done` ratio.
- **"Today" checklist** on home aggregates today's schedule blocks + pending subtasks, with expected durations from block times.
- **"Up next"** = next upcoming schedule block.

## Keyboard system

- Global chord map, i3-style: `Alt+1..4` switch pages (home / notes / plans / schedule) — implemented in `src/keyboard/` (`keymap.ts` combo matching + `useKeymap.ts` window listener). Future: `Mod+Enter` new item, arrow/Tab focus movement everywhere; every interactive element reachable by keyboard (focus rings visible).
- No command-palette / terminal-command navigation for now. When it lands (step 7), every action registers in a central command registry `{id, title, keybinding, run}` — the palette, keymap, and keybind customization all read from this registry; the current `Binding {combo, id, run, title?}` shape in `keymap.ts` is its seed.
- Keybindings overridable in `.studium/config.toml` (`[keys] "alt+1" = "goto.home"`).

## Theming

- All colors/spacing/fonts as CSS variables on `:root` (`--bg`, `--fg`, `--accent`, `--border`, `--font-mono`, ...), documented as the theme API.
- **base16/pywal**: Rust side reads `~/.cache/wal/colors.json` (and accepts a base16 yaml path in config); maps the 16 colors onto the CSS variables; watches the file so `wal` re-rice retints the app live.
- **User CSS**: any `.css` in `vault/.studium/themes/` selectable in config/palette; injected after the variable layer so it can override anything (Obsidian model).
- Ship 2–3 built-in fallback themes (gruvbox, nord) for machines without pywal.

## Development methodology

- **TDD on both backend and frontend**: before implementing a feature, write tests covering as much of its behavior as possible — happy paths, edge cases, and failure modes. Implementation follows until the tests pass.
  - Backend (Rust vault core and Tauri commands): `cargo test` — malformed frontmatter, dangling links, concurrent hand-edits, round-trip preservation.
  - Frontend (React components and domain logic): Vitest + React Testing Library — rendering, keyboard interaction, data transforms.
- **Periodic refactoring**: regularly consolidate and abstract code into its correct domain (vault I/O vs. schedule vs. plans vs. notes vs. keyboard/theming layers), adjusting existing tests and adding new ones as abstractions emerge. Refactors land as their own steps, not mixed into feature work.
- **Small features, one at a time**: each feature is implemented individually and completely — right abstractions, tests written first — before starting the next. No broad half-finished fronts.

## Implementation roadmap

1. **Scaffold**: `npm create tauri-app` (React-TS template) in `studium-desktop`; strip to minimal window (no decorations optional), set up CSS token layer + default Solarized theme, and build the static page-per-feature shell (one page per section, `Alt+1..4` switching, top bar, page chrome with keybinding hints) per the UI design section.
2. **Vault core (Rust)**: vault open/create, frontmatter parse/serialize round-trip, atomic writes, `notify` watcher, Tauri commands + events. This is the foundation — test it well (round-trip property tests on frontmatter preservation). Also add a `sample-vault/` fixture in the final vault format: it doubles as Rust test data and replaces the mock data in `src/data/mock.ts`.
3. **Notes module**: file list + CodeMirror editor, fuzzy finder. Simplest domain, proves the vault layer.
4. **Schedule module**: port the weekly grid logic from `apps/web/src/components/schedule/Schedule.tsx`, backed by `schedule.md`.
5. **Study plans module**: port from `apps/web/src/components/study-plans/`, backed by `plans/` tree; wiki-links between plans and schedule blocks.
6. **Home page**: today checklist, today's events, up-next, and plan progress — pure aggregation over the other modules' data, so it comes after them.
7. **Keyboard layer**: command registry, chord handling, command palette, config-file overrides.
8. **Theming**: pywal/base16 reader + watcher, user CSS loading, built-in themes.

Reference code to port from (cloned at scratchpad `studium/`): `apps/api/src/db/schema.ts` (domain model), `apps/web/src/components/{schedule,study-plans,documents}/`, `apps/web/src/fetchs/` (becomes the invoke layer).

## Verification

- `cargo test` for vault round-trip (parse → edit → serialize preserves body/comments/order).
- `npm test` (Vitest) for frontend components and domain logic.
- `npm run tauri dev` — manual end-to-end: create vault, add schedule block + plan + note in-app, verify files on disk are clean markdown; hand-edit a file in vim and confirm live reload; run `wal -i <img>` and confirm live retint.
- Keyboard-only pass: unplug-the-mouse test through all three modules.
