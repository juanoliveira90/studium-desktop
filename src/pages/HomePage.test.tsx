import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  it("builds today's checklist from today's blocks and pending subtasks", () => {
    render(<HomePage />);

    const list = screen.getByRole("list", { name: "today" });
    const items = within(list).getAllByRole("listitem");

    // Monday's two schedule blocks come first, with durations
    expect(items[0]).toHaveTextContent("calculus ii");
    expect(items[0]).toHaveTextContent("1h 30m");
    expect(items[1]).toHaveTextContent("gym");
    // then pending subtasks from the plans
    expect(list).toHaveTextContent("partial fractions");
    expect(list).toHaveTextContent("matrix factorizations (LU)");
    // done subtasks don't appear
    expect(list).not.toHaveTextContent("u-substitution drills");
  });

  it("marks blocks that are already over as done", () => {
    render(<HomePage />);

    // mock now is 13:00: calculus ii (ended 11:00) done, gym (17:00) pending
    expect(screen.getAllByText("calculus ii")[0].closest("li")).toHaveClass("is-done");
    expect(screen.getAllByText("gym")[0].closest("li")).not.toHaveClass("is-done");
  });

  it("renders today's schedule events with their times", () => {
    render(<HomePage />);

    const events = screen.getByRole("list", { name: "today's events" });
    expect(events).toHaveTextContent("calculus ii");
    expect(events).toHaveTextContent("09:30–11:00");
    expect(events).toHaveTextContent("gym");
    expect(events).toHaveTextContent("17:00–18:30");
  });

  it("does not show schedule events from other days", () => {
    render(<HomePage />);

    // "sicp reading" is Thursday's block (today is Monday in the mock clock)
    expect(screen.queryByText("sicp reading")).not.toBeInTheDocument();
  });

  it("derives up next from the first block after the mock now", () => {
    render(<HomePage />);

    const upNext = screen.getByText("today 17:00").closest(".entry");
    expect(upNext).toHaveTextContent("gym");
  });
});
