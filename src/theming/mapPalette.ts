import type { ThemeVars } from "./builtins";
import { mix, withAlpha } from "./color";
import type { Base16Palette, PywalPalette } from "./ipc";

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

/**
 * Maps a base16 scheme onto the token roles, following the canonical slot
 * semantics: base00–03 surfaces, base04–07 text, base08–0F accents
 * (08 red, 09 orange, 0A yellow, 0B green, 0C cyan, 0D blue, 0E magenta).
 */
export function mapBase16(scheme: Base16Palette): ThemeVars {
  const base = scheme.palette;
  const bg = base[0x0];
  const accent = base[0xd];
  return {
    "--bg": bg,
    "--bg-alt": base[0x1],
    "--bg-raised": base[0x2],
    "--fg": base[0x5],
    "--fg-bright": base[0x6],
    "--fg-dim": base[0x4],
    "--fg-faint": base[0x3],
    "--accent": accent,
    "--accent-dim": mix(accent, bg, 0.5),
    "--accent-bg": mix(accent, bg, 0.2),
    "--overlay": withAlpha(base[0x5], 0.4),
    "--border": base[0x2],
    "--border-focus": "var(--accent)",
    "--block-1": base[0xe],
    "--block-2": base[0xc],
    "--block-3": base[0x9],
    "--block-4": base[0xa],
    "--ok": base[0xb],
    "--warn": base[0xa],
    "--err": base[0x8],
  };
}
