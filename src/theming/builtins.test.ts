import { describe, expect, it } from "vitest";
import { BUILTIN_THEMES, THEME_COLOR_VARS } from "./builtins";

describe("BUILTIN_THEMES", () => {
  it("has unique ids and lowercase labels", () => {
    const ids = BUILTIN_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const theme of BUILTIN_THEMES) {
      expect(theme.label).toBe(theme.label.toLowerCase());
    }
  });

  it("starts with solarized light as the default, overriding nothing", () => {
    expect(BUILTIN_THEMES[0].id).toBe("solarized-light");
    expect(BUILTIN_THEMES[0].vars).toEqual({});
  });

  it("every other theme overrides the full color-var set and nothing else", () => {
    const colorVars = [...THEME_COLOR_VARS].sort();
    for (const theme of BUILTIN_THEMES.slice(1)) {
      expect(Object.keys(theme.vars).sort(), theme.id).toEqual(colorVars);
    }
  });

  it("only sets color values (never fonts, sizes or spacing)", () => {
    for (const theme of BUILTIN_THEMES) {
      for (const [name, value] of Object.entries(theme.vars)) {
        expect(name, theme.id).toMatch(/^--/);
        expect(value, `${theme.id} ${name}`).toMatch(
          /^(#[0-9a-f]{6}|rgb\(.+\)|var\(--accent\))$/,
        );
      }
    }
  });
});
