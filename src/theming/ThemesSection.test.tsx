import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemesSection } from "./ThemesSection";
import { ThemeSettingsContext, type ThemeSettings } from "./themeSettings";
import { BUILTIN_THEMES } from "./builtins";

function renderSection(overrides: Partial<ThemeSettings> = {}) {
  const theme: ThemeSettings = {
    themeId: "solarized-light",
    setThemeId: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeSettingsContext.Provider value={theme}>
      <ThemesSection />
    </ThemeSettingsContext.Provider>,
  );
  return theme;
}

describe("ThemesSection", () => {
  it("offers every built-in theme with the current one checked", () => {
    renderSection({ themeId: "nord" });

    const group = screen.getByRole("group", { name: "theme" });
    expect(group).toBeInTheDocument();
    for (const builtin of BUILTIN_THEMES) {
      expect(
        screen.getByRole("radio", { name: builtin.label }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "nord" })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "solarized light" }),
    ).not.toBeChecked();
  });

  it("selects a theme on click", async () => {
    const user = userEvent.setup();
    const theme = renderSection();

    await user.click(screen.getByRole("radio", { name: "rose pine" }));

    expect(theme.setThemeId).toHaveBeenCalledWith("rose-pine");
  });
});
