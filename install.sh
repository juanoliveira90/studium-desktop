#!/usr/bin/env bash
# Build studium and install it for the current user (~/.local).
# Run it again anytime to update — it rebuilds and overwrites in place.
set -euo pipefail
cd "$(dirname "$0")"

BIN_DIR="$HOME/.local/bin"
ICON_DIR="$HOME/.local/share/icons/hicolor/1024x1024/apps"
DESKTOP_DIR="$HOME/.local/share/applications"

# 1. Build the release binary
npm install
npm run tauri build

# Tauri names the binary after productName; fall back to the crate name
release_dir="src-tauri/target/release"
binary=""
for candidate in studium studium-desktop; do
    if [ -x "$release_dir/$candidate" ]; then
        binary="$release_dir/$candidate"
        break
    fi
done
if [ -z "$binary" ]; then
    echo "error: no release binary found in $release_dir" >&2
    exit 1
fi

# 2. Install binary, icon, and desktop entry
install -Dm755 "$binary" "$BIN_DIR/studium"
install -Dm644 public/studium.png "$ICON_DIR/studium.png"
install -Dm644 /dev/stdin "$DESKTOP_DIR/studium.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Studium
Comment=Local-first study dashboard
Exec=studium
Icon=studium
Terminal=false
Categories=Education;Office;
EOF

# 3. Refresh launcher caches (best effort — tools may not be installed)
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
gtk-update-icon-cache "$HOME/.local/share/icons/hicolor" 2>/dev/null || true

echo "Installed. Launch 'Studium' from your app launcher, or run 'studium'."
echo "(If 'studium' is not found, add ~/.local/bin to your PATH.)"
