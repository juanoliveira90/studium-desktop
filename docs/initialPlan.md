# Studium Desktop — Architecture & Tech Stack

## Context

Studium (github.com/juanoliveira90/studium) is a web productivity app for students: React/Vite frontend, Fastify + Postgres backend. Juan wants a desktop version at `/home/juan/Projects/studium-desktop` that is:

- **Local-first, no database** — an Obsidian-style vault in a user-chosen directory
- **The three core features**: weekly schedule, study plans (plans → subjects → subtasks), note taking
- **Fast and lightweight**, 100% keyboard-usable, i3-like aesthetic, themable like Obsidian/Linux apps

Decisions made with the user:

| Decision | Choice |
|---|---|
| Framework | **Tauri 2** (Rust core + webkitgtk webview) |
| Vault format | **All markdown + YAML frontmatter** (including schedule) |
| Keyboard model | **Non-modal chords, i3/emacs style** + command palette |
| Theming | **base16/pywal auto-detect + user CSS themes** in vault |

## Tech stack

- **Shell**: Tauri 2 (Rust). Rust side owns all filesystem access: vault I/O, frontmatter parsing (`gray_matter` or `serde_yaml` + manual split), file watching (`notify` crate), config.
- **Frontend**: React + TypeScript + Vite (same stack as web — port domain types and component logic from `apps/web`, but a fresh minimal UI, not the web look). No heavy UI kit: hand-rolled CSS on design tokens. Monospace font, 1px sharp borders, no rounded chrome — i3 aesthetic by default.
- **State**: TanStack Query against Tauri `invoke` commands (mirrors the web app's fetch layer, so porting is mechanical: `scheduleFetchs.ts` → `invoke("schedule_list")` etc.).
- **Markdown rendering/editing**: CodeMirror 6 for the note editor (lightweight, keyboard-first, used by Obsidian itself) with live-preview styling; `markdown-it` or CM6 decorations for rendering.
- **No backend, no auth, no i18n initially** (can port i18next later).

## Vault design

User picks/creates a vault directory on first run (remembered in `~/.config/studium/config.toml`). Vault layout:

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

- `schedule.md`: list of blocks with quoted time strings (`start: "09:30"`) in per-block frontmatter-style sections; links to plans via `[[plan-slug]]` wiki-links. Times always written quoted to dodge YAML coercion.
- Relations use directory/file slugs (rename = re-link; Rust side validates and reports dangling links rather than crashing).
- App writes must preserve markdown bodies untouched; only frontmatter is rewritten, keys in stable order.
- File watcher on the vault so hand-edits in vim/Obsidian appear live in the app.
- Atomic writes (write temp + rename) to avoid corrupting files.

## UI design (see docs/ReferenceImage.md)

The app is a **single tiled dashboard**, not a page-per-module app — all core panes visible at once, i3-style:

- **Layout**: fixed 2×2 tiling — top-left **home** (logo/tagline, "today" checklist with durations, "up next", quote, shell-style prompt line `~ /studium ▍`); top-right **notes** (search line, tag filter tabs `all/book/lecture/idea/personal`, note list with dates, `+ new note`); bottom-left **study plan** (`active/upcoming/archive` tabs, plans with date range, thin progress bar + percentage, `+ new plan`); bottom-right **week schedule** (hour rows ~08:00–22:00, day columns with dates, colored blocks, `‹ ›` week nav, `today` jump).
- **Pane chrome**: each pane has a lowercase title with its focus keybinding hinted in the corner (`notes (n)`, `study plan (p)`) — keybindings are discoverable from the UI itself. Focused pane gets an accent border (i3 focused-window style).
- **No app top bar**: the i3bar-style strip at the top of the reference image is the user's OS bar, not part of the app window — the app renders only the pane grid.
- **Visual language**: monospace font throughout, sharp corners, 1px borders, text-only tabs (active = filled block), unicode checkboxes (`☑/☐`), thin line progress bars, muted dark base with one accent color (purple in the reference — must derive entirely from the CSS variable theme layer so pywal retints everything).

Data-model implications from the reference:

- **Notes carry tags** (frontmatter `tags:`) driving the filter tabs.
- **Plans have a date range and computed progress** — `start`/`end` in `plan.md` frontmatter; progress % computed from subject subtasks `done` ratio.
- **"Today" checklist** on home aggregates today's schedule blocks + pending subtasks, with expected durations from block times.
- **"Up next"** = next upcoming schedule block.

## Keyboard system

- Global chord map, i3-style: `Mod+1/2/3` (schedule / plans / notes), `Mod+Enter` new item, `Mod+d` command palette (dmenu homage), `Ctrl+p` fuzzy file/note finder, arrow/Tab focus movement everywhere; every interactive element reachable by keyboard (focus rings visible).
- Command palette is the escape hatch: every action registered in a central command registry `{id, title, keybinding, run}` — palette, keymap, and future keybind customization all read from this registry.
- Keybindings overridable in `.studium/config.toml` (`[keys] "mod+1" = "goto.schedule"`).

## Theming

- All colors/spacing/fonts as CSS variables on `:root` (`--bg`, `--fg`, `--accent`, `--border`, `--font-mono`, ...), documented as the theme API.
- **base16/pywal**: Rust side reads `~/.cache/wal/colors.json` (and accepts a base16 yaml path in config); maps the 16 colors onto the CSS variables; watches the file so `wal` re-rice retints the app live.
- **User CSS**: any `.css` in `vault/.studium/themes/` selectable in config/palette; injected after the variable layer so it can override anything (Obsidian model).
- Ship 2–3 built-in fallback themes (gruvbox, nord) for machines without pywal.

## Development methodology

- **TDD on the backend (Rust vault core and Tauri commands)**: before implementing a feature, write tests covering as much of its behavior as possible — happy paths, edge cases (malformed frontmatter, dangling links, concurrent hand-edits), and failure modes. Implementation follows until the tests pass.
- **Periodic refactoring**: regularly consolidate and abstract code into its correct domain (vault I/O vs. schedule vs. plans vs. notes vs. keyboard/theming layers), adjusting existing tests and adding new ones as abstractions emerge. Refactors land as their own steps, not mixed into feature work.
- **Small features, one at a time**: each feature is implemented individually and completely — right abstractions, tests written first — before starting the next. No broad half-finished fronts.

## Implementation roadmap

1. **Scaffold**: `npm create tauri-app` (React-TS template) in `studium-desktop`; strip to minimal window (no decorations optional), set up CSS token layer + default i3-ish theme, and build the static tiled dashboard shell (2×2 pane grid, pane chrome with keybinding hints) per the UI design section.
2. **Vault core (Rust)**: vault open/create, frontmatter parse/serialize round-trip, atomic writes, `notify` watcher, Tauri commands + events. This is the foundation — test it well (round-trip property tests on frontmatter preservation). Also add a `sample-vault/` fixture in the final vault format: it doubles as Rust test data and replaces the panes' inline mock data.
3. **Notes module**: file list + CodeMirror editor, fuzzy finder. Simplest domain, proves the vault layer.
4. **Schedule module**: port the weekly grid logic from `apps/web/src/components/schedule/Schedule.tsx`, backed by `schedule.md`.
5. **Study plans module**: port from `apps/web/src/components/study-plans/`, backed by `plans/` tree; wiki-links between plans and schedule blocks.
6. **Home pane**: today checklist, up-next, and plan progress — pure aggregation over the other modules' data, so it comes after them.
7. **Keyboard layer**: command registry, chord handling, command palette, config-file overrides.
8. **Theming**: pywal/base16 reader + watcher, user CSS loading, built-in themes.

Reference code to port from (cloned at scratchpad `studium/`): `apps/api/src/db/schema.ts` (domain model), `apps/web/src/components/{schedule,study-plans,documents}/`, `apps/web/src/fetchs/` (becomes the invoke layer).

## Verification

- `cargo test` for vault round-trip (parse → edit → serialize preserves body/comments/order).
- `npm run tauri dev` — manual end-to-end: create vault, add schedule block + plan + note in-app, verify files on disk are clean markdown; hand-edit a file in vim and confirm live reload; run `wal -i <img>` and confirm live retint.
- Keyboard-only pass: unplug-the-mouse test through all three modules.
