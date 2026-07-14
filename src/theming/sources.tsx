import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BUILTIN_THEMES, type ThemeVars } from "./builtins";
import { applyThemeVars } from "./inject";
import { mapPywal } from "./mapPalette";
import { onThemeChanged, type PywalPalette } from "./ipc";
import { useThemeSettings } from "./themeSettings";
import { usePywalPalette } from "./useSnippets";

/**
 * The var overrides for the active selection. A pywal palette that hasn't
 * loaded (or failed to) falls back to the tokens.css defaults; the themes
 * config section shows the error beside the selection.
 */
function activeVars(themeId: string, pywalPalette: PywalPalette | undefined): ThemeVars {
  if (themeId === "pywal") {
    if (!pywalPalette) return {};
    return mapPywal(pywalPalette);
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

  // wal re-rice on disk → refetch → the effect below retints live.
  useEffect(
    () =>
      onThemeChanged((source) => {
        queryClient.invalidateQueries({ queryKey: ["theme", source] });
      }),
    [queryClient],
  );

  const vars = activeVars(themeId, pywal.data);
  useEffect(() => {
    applyThemeVars(vars);
    // Deriving `vars` is cheap and applyThemeVars replaces one <style>'s
    // text; re-running per render beats memoizing the object identity.
  });

  return null;
}
