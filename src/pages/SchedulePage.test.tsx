import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchedulePage } from "./SchedulePage";

describe("SchedulePage", () => {
  it("renders a column head for each weekday of the recurring routine", () => {
    render(<SchedulePage />);

    for (const day of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]) {
      expect(screen.getByText(day)).toBeInTheDocument();
    }
  });

  it("renders hour labels every two hours from 08:00 to 22:00", () => {
    render(<SchedulePage />);

    for (const hour of ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]) {
      expect(screen.getByText(hour)).toBeInTheDocument();
    }
    expect(screen.queryByText("09:00")).not.toBeInTheDocument();
  });

  it("places blocks on a half-hour grid from their frontmatter times", () => {
    render(<SchedulePage />);

    // "sicp reading" runs thu 14:00–16:00: rows are half-hours offset from
    // 08:00 plus one header row → row (14-8)*2+2 = 14, span 4 half-hours.
    const sicp = screen.getByText("sicp reading");
    expect(sicp).toHaveStyle({ gridRow: "14 / span 4" });
    expect(sicp).toHaveStyle({ gridColumn: "5" });

    // "gym" runs mon 17:00–18:30 → row (17-8)*2+2 = 20, span 3.
    const gym = screen.getByText("gym");
    expect(gym).toHaveStyle({ gridRow: "20 / span 3" });
    expect(gym).toHaveStyle({ gridColumn: "2" });
  });

  it("colors blocks by their linked plan and leaves unlinked blocks default", () => {
    render(<SchedulePage />);

    const calc = screen.getAllByText("calculus ii")[0];
    expect(calc).toHaveStyle({ background: "var(--block-1)" });
    expect(screen.getByText("gym").getAttribute("style")).not.toContain("background");
  });

  it("labels the schedule as the weekly routine, with no week navigation", () => {
    render(<SchedulePage />);

    expect(screen.getByText("weekly routine")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "previous week" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "next week" })).not.toBeInTheDocument();
  });
});
