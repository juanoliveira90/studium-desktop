# studium-desktop

Local-first desktop version of Studium (github.com/juanoliveira90/studium): a study dashboard with a weekly schedule, study plans, and notes. No database — all data is plain markdown with YAML frontmatter in a user-chosen Obsidian-style vault. Tauri 2 shell (Rust owns all filesystem/vault I/O) with a React + TypeScript + Vite frontend. i3-like aesthetic: monospace, 1px borders, sharp corners, fully keyboard-driven, themable via CSS variables (pywal/base16 + user CSS).

Full architecture, vault format, and implementation roadmap: `docs/initialPlan.md`. Visual reference: `docs/ReferenceImage.md`.

## Structure

```
src/                    React frontend
  main.tsx              entry; imports the style layers in order
  App.tsx               top bar + 2x2 dashboard grid
  styles/tokens.css     theme API — every color/font/spacing as CSS vars; themes override only these
  styles/base.css       reset + global element styles
  styles/app.css        all layout/pane styling
  components/           shared chrome (TopBar, Pane)
  panes/                the four dashboard panes (Home, Notes, Plans, Schedule)
src-tauri/              Rust shell; vault core + Tauri commands land here (roadmap step 2)
docs/                   initialPlan.md (source of truth), ReferenceImage.md
```

## Conventions

- Hand-rolled CSS on the token layer only — no UI kit; new colors/spacing become tokens in `tokens.css`, never hardcoded values.
- Panes are currently static placeholder data; real data arrives via Tauri `invoke` + TanStack Query as roadmap steps 2–6 land.
- TDD on the Rust side (vault core): tests first, including malformed-frontmatter/edge cases. Writes must preserve markdown bodies and be atomic.
- Verify frontend with `npm run build` (tsc + vite). Running the app needs the Tauri Linux system libs (see README). 
