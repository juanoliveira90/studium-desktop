# studium-desktop

Local-first desktop version of Studium (github.com/juanoliveira90/studium): a study dashboard with a weekly schedule, study plans, and notes. No database — all data is plain markdown with YAML frontmatter in a user-chosen Obsidian-style vault. Tauri 2 shell (Rust owns all filesystem/vault I/O) with a React + TypeScript + Vite frontend. i3-like aesthetic: monospace, 1px borders, sharp corners, fully keyboard-driven, themable via CSS variables (pywal/base16 + user CSS).

Full architecture, vault format, and implementation roadmap: `docs/initialPlan.md`. Visual reference: `docs/ReferenceImage.md`.

## Structure

```
src/                    React frontend
  main.tsx              entry; imports the style layers in order
  App.tsx               page shell: active-page state + Alt+1..4 keymap + bottom status bar
  styles/tokens.css     theme API — every color/font/spacing as CSS vars; themes override only these
  styles/base.css       reset + global element styles
  styles/app.css        all layout/page styling
  components/           shared chrome (Page, StatusBar)
  keyboard/             keymap combo matching + useKeymap window listener (seed of the command registry)
  data/                 mock.ts — shared placeholder data mirroring sample-vault/ + derivation helpers
  pages/                one page per feature (Home, Notes, Plans, Schedule) + pages.ts registry
src-tauri/              Rust shell
  src/vault/            vault core: frontmatter round-trip, atomic writes, open/create/list/read/write, notify watcher
  src/config.rs         app config (~/.config/studium/config.toml — remembered vault path)
  src/commands.rs       Tauri invoke surface (vault_open/create, doc_list/read/write) + vault:changed event
  tests/vault_core.rs   integration + property tests for all of the above
sample-vault/           vault fixture in the final format — Rust test data; replaces page mock data as modules land
docs/                   initialPlan.md (source of truth), ReferenceImage.md
```

## Commands

Node lives at `~/.local/opt/node/bin` if not on PATH (until installed via pacman).

```sh
npm install                 # install frontend deps (once, or after package.json changes)
npm run dev                 # Vite dev server only, http://localhost:1420 (works without Rust toolchain)
npm run build               # typecheck (tsc) + production frontend build — the quick CI-style check
npm run preview             # serve the production build locally
npm run lint                # ESLint over the frontend (flat config, eslint.config.js)
npm test                    # Vitest run (frontend unit/component tests)
npm run test:watch          # Vitest in watch mode
npm run tauri dev           # full desktop app with hot reload (needs Rust + webkit2gtk, see README)
npm run tauri build         # release binary + packages in src-tauri/target/release/
cargo test                  # Rust tests — run from src-tauri/
```

## Conventions

- Hand-rolled CSS on the token layer only — no UI kit; new colors/spacing become tokens in `tokens.css`, never hardcoded values.
- Pages are currently static placeholder data, centralized in `src/data/mock.ts`; real data arrives via Tauri `invoke` + TanStack Query as roadmap steps 3–6 land (the vault core and invoke surface from step 2 are in place).
- TDD on both sides — tests first, implementation until green:
  - Rust (vault core, Tauri commands): happy paths plus edge cases (malformed frontmatter, dangling links, concurrent hand-edits). Writes must preserve markdown bodies and be atomic.
  - Frontend (components, domain logic): Vitest + React Testing Library (`npm test`); tests live next to the code as `*.test.tsx`, jsdom environment, setup in `src/test/setup.ts`.
- Verify frontend with `npm run lint`, `npm test`, and `npm run build` (tsc + vite). Running the app needs the Tauri Linux system libs (see README).


## Rules

### Do
- After every update, check the docs to see if there is something out of date. If there is, update it.

### Don't
- Don't remove a test just because it's not passing (unless changed core logic)
- Don't make a commit if something is broken; each commit should be "production-ready"
- Don't make any changes if something is unclear; ALWAYS ask first.
- Unless you are explicitly told to do so, do not create a different git worktree for each feature. It's a small project, no need to do that. 
