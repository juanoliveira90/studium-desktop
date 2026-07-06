import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  it("renders every task in today's checklist", () => {
    render(<HomePage />);

    for (const label of [
      "algorithms — read chapter 4",
      "linear algebra — problem set 2",
      "operating systems — notes",
      "gym",
      "revisit spaced repetition",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("marks completed tasks as done", () => {
    render(<HomePage />);

    const done = screen.getByText("algorithms — read chapter 4").closest("li");
    const pending = screen.getByText("operating systems — notes").closest("li");
    expect(done).toHaveClass("is-done");
    expect(pending).not.toHaveClass("is-done");
  });

  it("renders today's schedule events with their times", () => {
    render(<HomePage />);

    const events = screen.getByRole("list", { name: "today's events" });
    expect(events).toHaveTextContent("12:00–13:00");
    expect(events).toHaveTextContent("lunch");
    expect(events).toHaveTextContent("14:00–16:00");
    expect(events).toHaveTextContent("discrete math");
    expect(events).toHaveTextContent("19:00–21:00");
    expect(events).toHaveTextContent("project work");
  });

  it("does not show schedule events from other days", () => {
    render(<HomePage />);

    // "read paper" is Friday's block (today is Wednesday in the mock week)
    expect(screen.queryByText("read paper")).not.toBeInTheDocument();
  });

  it("derives up next from the first block after the mock now", () => {
    render(<HomePage />);

    // mock now is 13:00 on Wednesday; the next block is discrete math at 14:00
    const upNext = screen.getByText("today 14:00").closest(".entry");
    expect(upNext).toHaveTextContent("discrete math");
  });
});
