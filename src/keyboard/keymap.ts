/*
 * Combo parsing and matching for the global keymap.
 * `Binding` is the seed of the future command registry (roadmap step 7):
 * config.toml key overrides will rewrite `combo` per `id`.
 */

export interface Combo {
  alt: boolean;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
  key: string;
}

export interface Binding {
  combo: string;
  id: string;
  run: () => void;
  title?: string;
}

const MODIFIERS = new Set(["alt", "ctrl", "shift", "meta"]);

export function parseCombo(combo: string): Combo {
  const parts = combo.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1).filter((p) => MODIFIERS.has(p)));
  return {
    alt: mods.has("alt"),
    ctrl: mods.has("ctrl"),
    shift: mods.has("shift"),
    meta: mods.has("meta"),
    key,
  };
}

export function eventMatchesCombo(event: KeyboardEvent, combo: string): boolean {
  const c = parseCombo(combo);
  if (
    event.altKey !== c.alt ||
    event.ctrlKey !== c.ctrl ||
    event.shiftKey !== c.shift ||
    event.metaKey !== c.meta
  ) {
    return false;
  }
  if (event.key.toLowerCase() === c.key) return true;
  // Layout-independent fallback: some layouts remap modifier+digit to
  // another character, but `code` always names the physical number-row key.
  return /^\d$/.test(c.key) && event.code === `Digit${c.key}`;
}

export function findBinding(
  event: KeyboardEvent,
  bindings: Binding[],
): Binding | undefined {
  return bindings.find((b) => eventMatchesCombo(event, b.combo));
}
