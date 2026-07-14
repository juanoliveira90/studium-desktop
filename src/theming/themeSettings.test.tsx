import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useThemeSettingsState } from "./themeSettings";

/** Exposes the hook's state and setters as plain DOM for assertions. */
function Probe() {
  const theme = useThemeSettingsState();
  return (
    <div>
      <p data-testid="theme-id">{theme.themeId}</p>
      <p data-testid="snippets">{theme.enabledSnippets.join(",")}</p>
      <button onClick={() => theme.setThemeId("nord")}>pick nord</button>
      <button onClick={() => theme.toggleSnippet("mine.css")}>
        toggle mine
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("useThemeSettingsState", () => {
  it("defaults to solarized light", () => {
    render(<Probe />);

    expect(screen.getByTestId("theme-id")).toHaveTextContent("solarized-light");
  });

  it("reads the persisted theme from localStorage", () => {
    localStorage.setItem("studium.ui.theme", "gruvbox-dark");
    render(<Probe />);

    expect(screen.getByTestId("theme-id")).toHaveTextContent("gruvbox-dark");
  });

  it("accepts pywal as a persisted source", () => {
    localStorage.setItem("studium.ui.theme", "pywal");
    render(<Probe />);

    expect(screen.getByTestId("theme-id")).toHaveTextContent("pywal");
  });

  it("falls back to the default on an unknown stored theme", () => {
    localStorage.setItem("studium.ui.theme", "hotdog-stand");
    render(<Probe />);

    expect(screen.getByTestId("theme-id")).toHaveTextContent("solarized-light");
  });

  it("defaults to no enabled snippets and survives garbage stored JSON", () => {
    localStorage.setItem("studium.ui.themeSnippets", "not json [");
    render(<Probe />);

    expect(screen.getByTestId("snippets")).toHaveTextContent("");
  });

  it("reads persisted enabled snippets, keeping only string entries", () => {
    localStorage.setItem(
      "studium.ui.themeSnippets",
      JSON.stringify(["a.css", 7, "b.css"]),
    );
    render(<Probe />);

    expect(screen.getByTestId("snippets")).toHaveTextContent("a.css,b.css");
  });

  it("toggleSnippet enables, persists, then disables", async () => {
    const user = userEvent.setup();
    render(<Probe />);

    await user.click(screen.getByRole("button", { name: "toggle mine" }));
    expect(screen.getByTestId("snippets")).toHaveTextContent("mine.css");
    expect(localStorage.getItem("studium.ui.themeSnippets")).toBe(
      JSON.stringify(["mine.css"]),
    );

    await user.click(screen.getByRole("button", { name: "toggle mine" }));
    expect(screen.getByTestId("snippets")).toHaveTextContent(/^$/);
    expect(localStorage.getItem("studium.ui.themeSnippets")).toBe("[]");
  });

  it("setter persists and updates state", async () => {
    const user = userEvent.setup();
    render(<Probe />);

    await user.click(screen.getByRole("button", { name: "pick nord" }));

    expect(screen.getByTestId("theme-id")).toHaveTextContent("nord");
    expect(localStorage.getItem("studium.ui.theme")).toBe("nord");
  });
});
