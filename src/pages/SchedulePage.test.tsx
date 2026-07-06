import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchedulePage } from "./SchedulePage";

describe("SchedulePage", () => {
  it("renders a column head for each day of the week", () => {
    render(<SchedulePage />);

    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getByText(new RegExp(`^${day} \\d+$`))).toBeInTheDocument();
    }
  });

  it("renders hour labels every two hours from 08:00 to 22:00", () => {
    render(<SchedulePage />);

    for (const hour of ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]) {
      expect(screen.getByText(hour)).toBeInTheDocument();
    }
    expect(screen.queryByText("09:00")).not.toBeInTheDocument();
  });

  it("places a block in the grid row derived from its start hour and span from its duration", () => {
    render(<SchedulePage />);

    // "project work" runs 19:00–21:00: rows are offset by START_HOUR (8)
    // plus one header row, so it starts at grid row 13 and spans 2 hours.
    const block = screen.getByText("project work");
    expect(block).toHaveStyle({ gridRow: "13 / span 2" });
    expect(block).toHaveStyle({ gridColumn: "4" });
  });

  it("renders week navigation controls", () => {
    render(<SchedulePage />);

    expect(
      screen.getByRole("button", { name: "previous week" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "next week" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "today" })).toBeInTheDocument();
  });
});
