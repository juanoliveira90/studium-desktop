import { beforeEach, describe, expect, it } from "vitest";
import { applySnippets, applyThemeVars } from "./inject";

beforeEach(() => {
  document.getElementById("studium-theme-vars")?.remove();
  document
    .querySelectorAll("style[data-theme-snippet]")
    .forEach((el) => el.remove());
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

describe("applySnippets", () => {
  it("injects snippets after the theme vars element, in the given order", () => {
    applyThemeVars({ "--bg": "#2e3440" });
    applySnippets([
      { name: "a.css", css: "body { outline: 1px solid red; }" },
      { name: "b.css", css: ".app { border: 0; }" },
    ]);

    const styles = [...document.head.querySelectorAll("style")];
    const varsIndex = styles.findIndex((s) => s.id === "studium-theme-vars");
    const aIndex = styles.findIndex(
      (s) => s.dataset.themeSnippet === "a.css",
    );
    const bIndex = styles.findIndex(
      (s) => s.dataset.themeSnippet === "b.css",
    );
    expect(varsIndex).toBeGreaterThanOrEqual(0);
    expect(aIndex).toBeGreaterThan(varsIndex);
    expect(bIndex).toBeGreaterThan(aIndex);
    expect(styles[aIndex].textContent).toContain("outline");
  });

  it("replaces previously injected snippets on re-apply", () => {
    applySnippets([{ name: "a.css", css: "/* old */" }]);
    applySnippets([{ name: "b.css", css: "/* new */" }]);

    const snippets = document.head.querySelectorAll("style[data-theme-snippet]");
    expect(snippets).toHaveLength(1);
    expect((snippets[0] as HTMLElement).dataset.themeSnippet).toBe("b.css");
  });

  it("removes everything when no snippets are enabled", () => {
    applySnippets([{ name: "a.css", css: "/* x */" }]);
    applySnippets([]);

    expect(
      document.head.querySelectorAll("style[data-theme-snippet]"),
    ).toHaveLength(0);
  });

  it("keeps snippets after the vars element even when applied first", () => {
    applySnippets([{ name: "a.css", css: "/* x */" }]);
    applyThemeVars({ "--bg": "#282828" });

    const styles = [...document.head.querySelectorAll("style")];
    const varsIndex = styles.findIndex((s) => s.id === "studium-theme-vars");
    const aIndex = styles.findIndex(
      (s) => s.dataset.themeSnippet === "a.css",
    );
    expect(aIndex).toBeGreaterThan(varsIndex);
  });
});
