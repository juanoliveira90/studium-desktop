import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomizationSection } from "./CustomizationSection";
import { UiSettingsContext, type UiSettings } from "./uiSettings";

function renderSection(overrides: Partial<UiSettings> = {}) {
  const ui: UiSettings = {
    barPosition: "top",
    setBarPosition: vi.fn(),
    showLabels: true,
    setShowLabels: vi.fn(),
    ...overrides,
  };
  render(
    <UiSettingsContext.Provider value={ui}>
      <CustomizationSection />
    </UiSettingsContext.Provider>,
  );
  return ui;
}

describe("CustomizationSection", () => {
  it("offers all four bar positions with the current one checked", () => {
    renderSection({ barPosition: "right" });

    const group = screen.getByRole("group", { name: "bar position" });
    expect(group).toBeInTheDocument();
    for (const position of ["top", "bottom", "left", "right"]) {
      expect(screen.getByRole("radio", { name: position })).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "right" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "top" })).not.toBeChecked();
  });

  it("changes the bar position on click", async () => {
    const user = userEvent.setup();
    const ui = renderSection();

    await user.click(screen.getByRole("radio", { name: "left" }));

    expect(ui.setBarPosition).toHaveBeenCalledWith("left");
  });

  it("reflects and toggles the show-labels setting", async () => {
    const user = userEvent.setup();
    const ui = renderSection({ showLabels: false });

    const checkbox = screen.getByRole("checkbox", { name: "show labels" });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(ui.setShowLabels).toHaveBeenCalledWith(true);
  });
});
