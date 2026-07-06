import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusBar } from "./StatusBar";
import { PAGES } from "../pages/pages";

describe("StatusBar", () => {
  it("renders a button per page with its title and keybinding", () => {
    render(<StatusBar pages={PAGES} activeId="home" onSelect={() => {}} />);

    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.getByRole("button", { name: /alt\+1 home/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /alt\+4 week/ })).toBeInTheDocument();
  });

  it("marks the active page as current", () => {
    render(<StatusBar pages={PAGES} activeId="notes" onSelect={() => {}} />);

    const active = screen.getByRole("button", { name: /notes/ });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /home/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("selects a page on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StatusBar pages={PAGES} activeId="home" onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /notes/ }));

    expect(onSelect).toHaveBeenCalledWith("notes");
  });
});
