import { createContext, useContext, useEffect, useState } from "react";
import { BUILTIN_THEMES } from "./builtins";
import { applyThemeVars } from "./inject";

/**
 * Theme selection (config modal → themes section), persisted in
 * localStorage like the other UI customization settings.
 */

export interface ThemeSettings {
  themeId: string;
  setThemeId: (id: string) => void;
}

const THEME_KEY = "studium.ui.theme";
const DEFAULT_THEME_ID = BUILTIN_THEMES[0].id;

function isKnownThemeId(id: string | null): id is string {
  return BUILTIN_THEMES.some((theme) => theme.id === id);
}

function loadThemeId(): string {
  const stored = localStorage.getItem(THEME_KEY);
  return isKnownThemeId(stored) ? stored : DEFAULT_THEME_ID;
}

/** Single state source for the theme; owned by the app shell. */
export function useThemeSettingsState(): ThemeSettings {
  const [themeId, setThemeIdState] = useState(loadThemeId);

  const setThemeId = (id: string) => {
    localStorage.setItem(THEME_KEY, id);
    setThemeIdState(id);
  };

  useEffect(() => {
    const theme = BUILTIN_THEMES.find((t) => t.id === themeId);
    applyThemeVars(theme?.vars ?? {});
  }, [themeId]);

  return { themeId, setThemeId };
}

export const ThemeSettingsContext = createContext<ThemeSettings>({
  themeId: DEFAULT_THEME_ID,
  setThemeId: () => {},
});

export function useThemeSettings(): ThemeSettings {
  return useContext(ThemeSettingsContext);
}
