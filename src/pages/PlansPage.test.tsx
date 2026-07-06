import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlansPage } from "./PlansPage";

describe("PlansPage", () => {
  it("lists every plan with its formatted date range", () => {
    render(<PlansPage />);

    expect(screen.getByText("Calculus II")).toBeInTheDocument();
    expect(screen.getByText("Jun 1 — Jul 20")).toBeInTheDocument();
    expect(screen.getByText("Linear Algebra")).toBeInTheDocument();
    expect(screen.getByText("Jul 1 — Aug 30")).toBeInTheDocument();
  });

  it("computes progress from the plans' subtasks", () => {
    render(<PlansPage />);

    // calculus-ii: 3 of 7 subtasks done; linear-algebra: 1 of 2
    expect(screen.getByText("43%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("keeps the status tabs and the new-plan action", () => {
    render(<PlansPage />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["active", "upcoming", "archive"]);
    expect(screen.getByRole("button", { name: "+ new plan" })).toBeInTheDocument();
  });
});
