import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusBar } from "./StatusBar";
import { PAGES } from "../pages/pages";

function renderBar(overrides: Partial<Parameters<typeof StatusBar>[0]> = {}) {
  return render(
    <StatusBar pages={PAGES} activeId="home" onSelect={() => {}} {...overrides} />,
  );
}

describe("StatusBar", () => {
  it("renders a button per page with its title", () => {
    renderBar();

    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "weekly routine" })).toBeInTheDocument();
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
});
