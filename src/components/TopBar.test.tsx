import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "./TopBar";
import { SettingsContext } from "./settingsContext";
import { PAGES } from "../pages/pages";

function renderBar(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  return render(
    <TopBar pages={PAGES} activeId="home" onSelect={() => {}} {...overrides} />,
  );
}

describe("TopBar", () => {
  it("renders a button per page with its title", () => {
    renderBar();

    expect(screen.getByRole("button", { name: "home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "notes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "study plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "weekly routine" })).toBeInTheDocument();
  });

  it("shows an icon on every page button", () => {
    const { container } = renderBar();

    const nav = container.querySelector(".top-bar-nav")!;
    expect(nav.querySelectorAll("svg")).toHaveLength(PAGES.length);
  });

  it("marks the active page as current", () => {
    renderBar({ activeId: "notes" });

    const active = screen.getByRole("button", { name: /notes/ });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /home/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("selects a page on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderBar({ onSelect });

    await user.click(screen.getByRole("button", { name: /notes/ }));

    expect(onSelect).toHaveBeenCalledWith("notes");
  });

  it("opens vault settings from the gear button", async () => {
    const user = userEvent.setup();
    const openSettings = vi.fn();
    render(
      <SettingsContext.Provider value={openSettings}>
        <TopBar pages={PAGES} activeId="home" onSelect={() => {}} />
      </SettingsContext.Provider>,
    );

    await user.click(screen.getByRole("button", { name: "vault settings" }));

    expect(openSettings).toHaveBeenCalled();
  });
});
