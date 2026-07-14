import type { ThemeVars } from "./builtins";

/**
 * Runtime style injection. tokens.css ships in the bundle; the active
 * theme's overrides live in a single <style id="studium-theme-vars">
 * appended to <head>, which wins the cascade at equal specificity. User
 * CSS snippets are injected as one <style data-theme-snippet> each,
 * always after the vars element so they can override anything
 * (Obsidian's snippet model).
 */

const VARS_STYLE_ID = "studium-theme-vars";
const SNIPPET_ATTR = "data-theme-snippet";

export interface Snippet {
  name: string;
  css: string;
}

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

/** Replace the injected snippet set, keeping order right after the vars. */
export function applySnippets(snippets: Snippet[]): void {
  document.head
    .querySelectorAll(`style[${SNIPPET_ATTR}]`)
    .forEach((el) => el.remove());
  let previous: Element = varsElement();
  for (const snippet of snippets) {
    const el = document.createElement("style");
    el.setAttribute(SNIPPET_ATTR, snippet.name);
    el.textContent = snippet.css;
    previous.after(el);
    previous = el;
  }
}
