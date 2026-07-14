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
      <button onClick={() => theme.setThemeId("nord")}>pick nord</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.getElementById("studium-theme-vars")?.remove();
});

describe("useThemeSettingsState", () => {
  it("defaults to solarized light with no overrides applied", () => {
    render(<Probe />);

    expect(screen.getByTestId("theme-id")).toHaveTextContent("solarized-light");
    expect(document.getElementById("studium-theme-vars")?.textContent).toBe("");
  });

  it("reads the persisted theme from localStorage and applies it", () => {
    localStorage.setItem("studium.ui.theme", "gruvbox-dark");
    render(<Probe />);

    expect(screen.getByTestId("theme-id")).toHaveTextContent("gruvbox-dark");
    const style = document.getElementById("studium-theme-vars");
    expect(style?.textContent).toContain("--bg: #282828;");
  });

  it("falls back to the default on an unknown stored theme", () => {
    localStorage.setItem("studium.ui.theme", "hotdog-stand");
    render(<Probe />);

    expect(screen.getByTestId("theme-id")).toHaveTextContent("solarized-light");
  });

  it("setter persists, updates state and retints", async () => {
    const user = userEvent.setup();
    render(<Probe />);

    await user.click(screen.getByRole("button", { name: "pick nord" }));

    expect(screen.getByTestId("theme-id")).toHaveTextContent("nord");
    expect(localStorage.getItem("studium.ui.theme")).toBe("nord");
    const style = document.getElementById("studium-theme-vars");
    expect(style?.textContent).toContain("--bg: #2e3440;");
  });
});
