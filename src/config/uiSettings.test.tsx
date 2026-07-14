import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUiSettingsState } from "./uiSettings";

/** Exposes the hook's state and setters as plain DOM for assertions. */
function Probe() {
  const ui = useUiSettingsState();
  return (
    <div>
      <p data-testid="bar-position">{ui.barPosition}</p>
      <p data-testid="show-labels">{String(ui.showLabels)}</p>
      <button onClick={() => ui.setBarPosition("bottom")}>move bottom</button>
      <button onClick={() => ui.setShowLabels(!ui.showLabels)}>toggle labels</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("useUiSettingsState", () => {
  it("defaults to a top bar with labels shown", () => {
    render(<Probe />);

    expect(screen.getByTestId("bar-position")).toHaveTextContent("top");
    expect(screen.getByTestId("show-labels")).toHaveTextContent("true");
  });

  it("reads persisted values from localStorage", () => {
    localStorage.setItem("studium.ui.barPosition", "left");
    localStorage.setItem("studium.ui.showLabels", "false");
    render(<Probe />);

    expect(screen.getByTestId("bar-position")).toHaveTextContent("left");
    expect(screen.getByTestId("show-labels")).toHaveTextContent("false");
  });

  it("falls back to defaults on garbage stored values", () => {
    localStorage.setItem("studium.ui.barPosition", "diagonal");
    localStorage.setItem("studium.ui.showLabels", "maybe");
    render(<Probe />);

    expect(screen.getByTestId("bar-position")).toHaveTextContent("top");
    expect(screen.getByTestId("show-labels")).toHaveTextContent("true");
  });

  it("setters update state and persist to localStorage", async () => {
    const user = userEvent.setup();
    render(<Probe />);

    await user.click(screen.getByRole("button", { name: "move bottom" }));
    expect(screen.getByTestId("bar-position")).toHaveTextContent("bottom");
    expect(localStorage.getItem("studium.ui.barPosition")).toBe("bottom");

    await user.click(screen.getByRole("button", { name: "toggle labels" }));
    expect(screen.getByTestId("show-labels")).toHaveTextContent("false");
    expect(localStorage.getItem("studium.ui.showLabels")).toBe("false");
  });
});
