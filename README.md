# studium

Local-first desktop version of [Studium](https://github.com/juanoliveira90/studium) — a study dashboard with weekly schedule, study plans, and notes, stored as plain markdown in an Obsidian-style vault. Built with Tauri 2 (Rust) + React/TypeScript. See `docs/initialPlan.md` for the architecture and roadmap.

## Prerequisites

- **Node.js ≥ 20** — `sudo pacman -S nodejs npm` (or the userspace install at `~/.local/opt/node/bin`, add it to your PATH)
- **Rust** (stable) and the Tauri Linux system libraries:

```sh
sudo pacman -S --needed rust webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg
```

(Other distros: see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/).)

## Install

With the prerequisites above in place, one script builds the app and installs it for your user (no sudo):

```sh
./install.sh
```

This compiles the release binary, then installs it as `studium` in `~/.local/bin`, plus the icon and a desktop entry under `~/.local/share` — after that, launch **Studium** from your app launcher like any other app, or run `studium` in a terminal (make sure `~/.local/bin` is on your PATH).

### Update

Pull the latest code and run the script again — it rebuilds and overwrites the installed copy in place:

```sh
git pull
./install.sh
```

Quit Studium before updating (a running instance keeps using the old binary until relaunched). Your data is never touched: the vault is plain markdown in the folder you chose, and the config lives at `~/.config/studium/config.toml`.

### Uninstall

```sh
rm ~/.local/bin/studium \
   ~/.local/share/applications/studium.desktop \
   ~/.local/share/icons/hicolor/1024x1024/apps/studium.png
```

## Run (development)

```sh
npm install        # once, after cloning
npm run tauri dev  # launches the desktop app with hot reload
```

### Frontend only

If you don't have the Rust/webkit toolchain set up, you can still work on the UI in a browser:

```sh
npm run dev        # Vite dev server at http://localhost:1420
```

## Build

```sh
npm run tauri build   # release binary + packages in src-tauri/target/release/
```

`npm run build` alone typechecks (`tsc`) and builds just the frontend into `dist/` — useful as a quick CI-style check.

## Lint & test

```sh
npm run lint         # ESLint (flat config, eslint.config.js)
npm run lint:rust    # Clippy over the Rust shell, warnings are errors (-D warnings)
npm test             # Vitest + React Testing Library, single run
npm run test:watch   # Vitest in watch mode
cargo test           # Rust vault-core tests (run from src-tauri/)
```

## Project layout

```
src/               React frontend
  styles/tokens.css  theme API — all colors/fonts/spacing as CSS variables
  components/        shared chrome (page, status bar)
  keyboard/          global keymap (Alt+1..4 page switching)
  vault/             typed invoke layer over the Tauri commands + vault session hooks
  notes/             notes module: domain model, query hooks, CodeMirror editor
  schedule/          schedule module: schedule.md domain model + week-grid math, query hook
  pages/             one page per feature (home, notes, plans, schedule)
src-tauri/         Rust shell: vault core (frontmatter, atomic writes, watcher) + Tauri commands
sample-vault/      example vault in the final format — doubles as Rust test data
docs/              plan + design reference + adr/ decision records
```
