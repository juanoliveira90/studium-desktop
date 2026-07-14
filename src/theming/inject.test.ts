import { beforeEach, describe, expect, it } from "vitest";
import { applyThemeVars } from "./inject";

beforeEach(() => {
  document.getElementById("studium-theme-vars")?.remove();
});

describe("applyThemeVars", () => {
  it("creates a single style element in head with a :root block", () => {
    applyThemeVars({ "--bg": "#2e3440", "--fg": "#d8dee9" });

    const styles = document.head.querySelectorAll("#studium-theme-vars");
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain(":root {");
    expect(styles[0].textContent).toContain("--bg: #2e3440;");
    expect(styles[0].textContent).toContain("--fg: #d8dee9;");
  });

  it("updates the existing element instead of adding another", () => {
    applyThemeVars({ "--bg": "#2e3440" });
    applyThemeVars({ "--bg": "#282828" });

    const styles = document.head.querySelectorAll("#studium-theme-vars");
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain("--bg: #282828;");
    expect(styles[0].textContent).not.toContain("#2e3440");
  });

  it("clears all overrides for the empty theme (tokens.css defaults win)", () => {
    applyThemeVars({ "--bg": "#2e3440" });
    applyThemeVars({});

    const style = document.getElementById("studium-theme-vars");
    expect(style?.textContent).toBe("");
  });
});
