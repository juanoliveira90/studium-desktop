import { describe, expect, it, vi } from "vitest";
import { eventMatchesCombo, findBinding, parseCombo } from "./keymap";

function keydown(init: KeyboardEventInit) {
  return new KeyboardEvent("keydown", init);
}

describe("parseCombo", () => {
  it("parses a modifier+key combo", () => {
    expect(parseCombo("alt+1")).toEqual({
      alt: true,
      ctrl: false,
      shift: false,
      meta: false,
      key: "1",
    });
  });

  it("is case-insensitive and parses multiple modifiers", () => {
    expect(parseCombo("Ctrl+Shift+P")).toEqual({
      alt: false,
      ctrl: true,
      shift: true,
      meta: false,
      key: "p",
    });
  });
});

describe("eventMatchesCombo", () => {
  it("matches when key and modifiers line up", () => {
    const event = keydown({ key: "1", code: "Digit1", altKey: true });
    expect(eventMatchesCombo(event, "alt+1")).toBe(true);
  });

  it("rejects when the required modifier is missing", () => {
    const event = keydown({ key: "1", code: "Digit1" });
    expect(eventMatchesCombo(event, "alt+1")).toBe(false);
  });

  it("rejects when an extra modifier is held", () => {
    const event = keydown({
      key: "1",
      code: "Digit1",
      altKey: true,
      ctrlKey: true,
    });
    expect(eventMatchesCombo(event, "alt+1")).toBe(false);
  });

  it("matches letter keys case-insensitively", () => {
    const event = keydown({ key: "N", code: "KeyN", altKey: true });
    expect(eventMatchesCombo(event, "alt+n")).toBe(true);
  });

  it("falls back to the physical digit code when the layout remaps the key", () => {
    // e.g. layouts where Alt+digit produces a different character
    const event = keydown({ key: "¡", code: "Digit1", altKey: true });
    expect(eventMatchesCombo(event, "alt+1")).toBe(true);
  });
});

describe("findBinding", () => {
  const bindings = [
    { combo: "alt+1", id: "goto.home", run: vi.fn() },
    { combo: "alt+2", id: "goto.notes", run: vi.fn() },
  ];

  it("returns the binding whose combo matches the event", () => {
    const event = keydown({ key: "2", code: "Digit2", altKey: true });
    expect(findBinding(event, bindings)?.id).toBe("goto.notes");
  });

  it("returns undefined when nothing matches", () => {
    const event = keydown({ key: "3", code: "Digit3", altKey: true });
    expect(findBinding(event, bindings)).toBeUndefined();
  });
});
