import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BUILTIN_THEMES, type ThemeVars } from "./builtins";
import { applyThemeVars } from "./inject";
import { mapBase16, mapPywal } from "./mapPalette";
import {
  onThemeChanged,
  type Base16Palette,
  type PywalPalette,
} from "./ipc";
import { useThemeSettings } from "./themeSettings";
import { useBase16Palette, usePywalPalette } from "./useSnippets";

/**
 * The var overrides for the active selection. A source palette that hasn't
 * loaded (or failed to) falls back to the tokens.css defaults; the themes
 * config section shows the error beside the selection.
 */
function activeVars(
  themeId: string,
  pywalPalette: PywalPalette | undefined,
  base16Palette: Base16Palette | undefined,
): ThemeVars {
  if (themeId === "pywal") {
    if (!pywalPalette) return {};
    return mapPywal(pywalPalette);
  }
  if (themeId === "base16") {
    if (!base16Palette) return {};
    return mapBase16(base16Palette);
  }
  const builtin = BUILTIN_THEMES.find((theme) => theme.id === themeId);
  return builtin?.vars ?? {};
}

/**
 * Invisible app-shell layer that owns the theme-vars style element: it is
 * the single place applyThemeVars is called from, so built-in themes and
 * async sources (pywal) can never fight over the cascade.
 */
export function ThemeVarsLayer() {
  const { themeId } = useThemeSettings();
  const queryClient = useQueryClient();
  const pywal = usePywalPalette(themeId === "pywal");
  const base16 = useBase16Palette(themeId === "base16");

  // wal re-rice on disk → refetch → the effect below retints live.
  useEffect(
    () =>
      onThemeChanged((source) => {
        queryClient.invalidateQueries({ queryKey: ["theme", source] });
      }),
    [queryClient],
  );

  const vars = activeVars(themeId, pywal.data, base16.data);
  useEffect(() => {
    applyThemeVars(vars);
    // Deriving `vars` is cheap and applyThemeVars replaces one <style>'s
    // text; re-running per render beats memoizing the object identity.
  });

  return null;
}
