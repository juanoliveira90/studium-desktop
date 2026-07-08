import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useContextMenu } from "./useContextMenu";

/** A harness that opens the menu on right-click of a target element. */
function Harness({
  onSelect,
  confirm = false,
}: {
  onSelect: () => void;
  confirm?: boolean;
}) {
  const { menu, open } = useContextMenu();
  return (
    <div>
      <button
        onContextMenu={(e) =>
          open(e, [
            {
              label: "delete",
              confirmLabel: confirm ? "really delete?" : undefined,
              onSelect,
            },
          ])
        }
      >
        target
      </button>
      {menu}
    </div>
  );
}

describe("ContextMenu", () => {
  it("opens at right-click and fires a plain item immediately", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("target") });
    await user.click(screen.getByRole("menuitem", { name: "delete" }));

    expect(onSelect).toHaveBeenCalledOnce();
    // menu closes after selecting
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("requires a second click for a confirm item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} confirm />);

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("target") });
    await user.click(screen.getByRole("menuitem", { name: "delete" }));
    // first click only arms it — nothing deleted yet
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole("menuitem", { name: "really delete?" }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("closes on backdrop click without selecting", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("target") });
    await user.click(screen.getByTestId("context-menu-backdrop"));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness onSelect={vi.fn()} />);

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("target") });
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
