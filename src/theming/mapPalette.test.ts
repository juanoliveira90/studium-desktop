import { describe, expect, it } from "vitest";
import { mapPywal } from "./mapPalette";
import { THEME_COLOR_VARS } from "./builtins";
import type { PywalPalette } from "./ipc";

const palette: PywalPalette = {
  background: "#1d2021",
  foreground: "#ebdbb2",
  cursor: "#ebdbb2",
  colors: [
    "#1d2021", // 0
    "#cc241d", // 1
    "#98971a", // 2
    "#d79921", // 3
    "#458588", // 4
    "#b16286", // 5
    "#689d6a", // 6
    "#a89984", // 7
    "#928374", // 8
    "#fb4934", // 9
    "#b8bb26", // 10
    "#fabd2f", // 11
    "#83a598", // 12
    "#d3869b", // 13
    "#8ec07c", // 14
    "#fbf1c7", // 15
  ],
};

describe("mapPywal", () => {
  it("covers the full theme color-var set", () => {
    const vars = mapPywal(palette);
    expect(Object.keys(vars).sort()).toEqual([...THEME_COLOR_VARS].sort());
  });

  it("maps the palette onto the token roles", () => {
    const vars = mapPywal(palette);
    expect(vars["--bg"]).toBe("#1d2021");
    expect(vars["--fg"]).toBe("#ebdbb2");
    expect(vars["--fg-bright"]).toBe("#fbf1c7");
    expect(vars["--fg-dim"]).toBe("#928374");
    expect(vars["--accent"]).toBe("#458588");
    expect(vars["--border-focus"]).toBe("var(--accent)");
    expect(vars["--block-1"]).toBe("#b16286");
    expect(vars["--ok"]).toBe("#98971a");
    expect(vars["--warn"]).toBe("#d79921");
    expect(vars["--err"]).toBe("#cc241d");
    expect(vars["--overlay"]).toBe("rgb(235 219 178 / 0.4)");
  });

  it("derives surfaces and tints by blending toward the background", () => {
    const vars = mapPywal(palette);
    // 6% fg over bg: each channel moves 6% of the way from bg to fg.
    expect(vars["--bg-alt"]).toBe("#292b2a");
    expect(vars["--bg-raised"]).toBe("#363632");
    expect(vars["--accent-dim"]).toBe("#315355");
    expect(vars["--accent-bg"]).toBe("#253436");
    expect(vars["--border"]).toBe("#3c3c37");
    expect(vars["--fg-faint"]).toBe("#58524b");
  });
});
