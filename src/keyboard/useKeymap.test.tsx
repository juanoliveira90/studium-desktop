import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeymap } from "./useKeymap";
import type { Binding } from "./keymap";

function pressAlt1(init: KeyboardEventInit = {}) {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "1",
      code: "Digit1",
      altKey: true,
      cancelable: true,
      ...init,
    }),
  );
}

describe("useKeymap", () => {
  it("runs the matching binding and prevents the default", () => {
    const run = vi.fn();
    renderHook(() => useKeymap([{ combo: "alt+1", id: "goto.home", run }]));

    const event = new KeyboardEvent("keydown", {
      key: "1",
      code: "Digit1",
      altKey: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(run).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not run on a non-matching key", () => {
    const run = vi.fn();
    renderHook(() => useKeymap([{ combo: "alt+1", id: "goto.home", run }]));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", code: "Digit1" }));

    expect(run).not.toHaveBeenCalled();
  });

  it("ignores key repeats", () => {
    const run = vi.fn();
    renderHook(() => useKeymap([{ combo: "alt+1", id: "goto.home", run }]));

    pressAlt1({ repeat: true });

    expect(run).not.toHaveBeenCalled();
  });

  it("sees the latest bindings after a re-render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ bindings }: { bindings: Binding[] }) => useKeymap(bindings),
      { initialProps: { bindings: [{ combo: "alt+1", id: "a", run: first }] } },
    );

    rerender({ bindings: [{ combo: "alt+1", id: "a", run: second }] });
    pressAlt1();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it("removes the listener on unmount", () => {
    const run = vi.fn();
    const { unmount } = renderHook(() =>
      useKeymap([{ combo: "alt+1", id: "goto.home", run }]),
    );

    unmount();
    pressAlt1();

    expect(run).not.toHaveBeenCalled();
  });
});
