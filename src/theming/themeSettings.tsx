import { createContext, useContext, useState } from "react";
import { BUILTIN_THEMES } from "./builtins";

/**
 * Theme selection and enabled user CSS snippets (config modal → themes
 * section), persisted in localStorage like the other UI customization
 * settings. Snippet names that no longer exist in the vault are simply
 * ignored by the injection layer, never pruned from storage.
 */

export interface ThemeSettings {
  themeId: string;
  setThemeId: (id: string) => void;
  enabledSnippets: string[];
  toggleSnippet: (name: string) => void;
}

const THEME_KEY = "studium.ui.theme";
const SNIPPETS_KEY = "studium.ui.themeSnippets";
const DEFAULT_THEME_ID = BUILTIN_THEMES[0].id;

/** Selectable non-builtin sources (live palettes read by Rust). */
export const THEME_SOURCES = ["pywal", "base16"] as const;

function isKnownThemeId(id: string | null): id is string {
  const isBuiltin = BUILTIN_THEMES.some((theme) => theme.id === id);
  const isSource = (THEME_SOURCES as readonly string[]).includes(id ?? "");
  return isBuiltin || isSource;
}

function loadThemeId(): string {
  const stored = localStorage.getItem(THEME_KEY);
  return isKnownThemeId(stored) ? stored : DEFAULT_THEME_ID;
}

function loadEnabledSnippets(): string[] {
  const stored = localStorage.getItem(SNIPPETS_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

/** Single state source for the theme; owned by the app shell. */
export function useThemeSettingsState(): ThemeSettings {
  const [themeId, setThemeIdState] = useState(loadThemeId);
  const [enabledSnippets, setEnabledSnippets] = useState(loadEnabledSnippets);

  const setThemeId = (id: string) => {
    localStorage.setItem(THEME_KEY, id);
    setThemeIdState(id);
  };

  const toggleSnippet = (name: string) => {
    const isEnabled = enabledSnippets.includes(name);
    const next = isEnabled
      ? enabledSnippets.filter((entry) => entry !== name)
      : [...enabledSnippets, name];
    localStorage.setItem(SNIPPETS_KEY, JSON.stringify(next));
    setEnabledSnippets(next);
  };

  return { themeId, setThemeId, enabledSnippets, toggleSnippet };
}

export const ThemeSettingsContext = createContext<ThemeSettings>({
  themeId: DEFAULT_THEME_ID,
  setThemeId: () => {},
  enabledSnippets: [],
  toggleSnippet: () => {},
});

export function useThemeSettings(): ThemeSettings {
  return useContext(ThemeSettingsContext);
}
