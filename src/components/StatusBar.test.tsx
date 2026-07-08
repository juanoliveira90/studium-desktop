import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusBar } from "./StatusBar";
import { PAGES } from "../pages/pages";

function renderBar(overrides: Partial<Parameters<typeof StatusBar>[0]> = {}) {
  return render(
    <StatusBar
      pages={PAGES}
      activeId="home"
      onSelect={() => {}}
      onSettings={() => {}}
      {...overrides}
    />,
  );
}

describe("StatusBar", () => {
  it("renders a button per page with its title and keybinding", () => {
    renderBar();

    // 4 pages + the settings button
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.getByRole("button", { name: /alt\+1 home/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /alt\+4 weekly routine/ })).toBeInTheDocument();
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

  it("fires onSettings from the vault settings button", async () => {
    const user = userEvent.setup();
    const onSettings = vi.fn();
    renderBar({ onSettings });

    await user.click(screen.getByRole("button", { name: "vault settings" }));

    expect(onSettings).toHaveBeenCalled();
  });
});
