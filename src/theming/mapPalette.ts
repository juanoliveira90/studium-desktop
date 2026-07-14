import type { ThemeVars } from "./builtins";
import { mix, withAlpha } from "./color";
import type { PywalPalette } from "./ipc";

/**
 * Maps a raw pywal palette (16 terminal colors + specials) onto the token
 * roles of styles/tokens.css. Slots follow the terminal convention:
 * color1 red, color2 green, color3 yellow, color4 blue, color5 magenta,
 * color6 cyan, color8 bright black (dim), color15 bright white.
 */
export function mapPywal(palette: PywalPalette): ThemeVars {
  const bg = palette.background;
  const fg = palette.foreground;
  const accent = palette.colors[4];
  return {
    "--bg": bg,
    "--bg-alt": mix(fg, bg, 0.06),
    "--bg-raised": mix(fg, bg, 0.12),
    "--fg": fg,
    "--fg-bright": palette.colors[15],
    "--fg-dim": palette.colors[8],
    "--fg-faint": mix(palette.colors[8], bg, 0.5),
    "--accent": accent,
    "--accent-dim": mix(accent, bg, 0.5),
    "--accent-bg": mix(accent, bg, 0.2),
    "--overlay": withAlpha(fg, 0.4),
    "--border": mix(fg, bg, 0.15),
    "--border-focus": "var(--accent)",
    "--block-1": palette.colors[5],
    "--block-2": palette.colors[6],
    "--block-3": palette.colors[1],
    "--block-4": palette.colors[3],
    "--ok": palette.colors[2],
    "--warn": palette.colors[3],
    "--err": palette.colors[1],
  };
}
