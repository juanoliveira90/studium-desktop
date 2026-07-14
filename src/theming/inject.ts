import type { ThemeVars } from "./builtins";

/**
 * Runtime style injection. tokens.css ships in the bundle; the active
 * theme's overrides live in a single <style id="studium-theme-vars">
 * appended to <head>, which wins the cascade at equal specificity.
 */

const VARS_STYLE_ID = "studium-theme-vars";

function varsElement(): HTMLStyleElement {
  const existing = document.getElementById(VARS_STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const el = document.createElement("style");
  el.id = VARS_STYLE_ID;
  document.head.append(el);
  return el;
}

/** Replace the active theme's variable overrides ({} = tokens.css defaults). */
export function applyThemeVars(vars: ThemeVars): void {
  const el = varsElement();
  const lines = Object.entries(vars).map(([name, value]) => `  ${name}: ${value};`);
  el.textContent = lines.length ? `:root {\n${lines.join("\n")}\n}` : "";
}
