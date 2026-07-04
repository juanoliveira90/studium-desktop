import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pane } from "./Pane";

describe("Pane", () => {
  it("renders the title as a heading with its keyboard hint", () => {
    render(
      <Pane title="notes" hint="n">
        <p>body</p>
      </Pane>,
    );

    expect(screen.getByRole("heading", { name: "notes" })).toBeInTheDocument();
    expect(screen.getByText("(n)")).toBeInTheDocument();
  });

  it("renders children inside the pane body", () => {
    render(
      <Pane title="plans" hint="p">
        <span>some pane content</span>
      </Pane>,
    );

    expect(screen.getByText("some pane content")).toBeInTheDocument();
  });

  it("replaces the default heading when a custom header is provided", () => {
    render(
      <Pane title="week" hint="w" header={<h2>custom header</h2>}>
        <p>body</p>
      </Pane>,
    );

    expect(
      screen.getByRole("heading", { name: "custom header" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "week" }),
    ).not.toBeInTheDocument();
  });

  it("is focusable and labelled by its title for keyboard navigation", () => {
    render(
      <Pane title="home" hint="h">
        <p>body</p>
      </Pane>,
    );

    const pane = screen.getByRole("region", { name: "home" });
    expect(pane).toHaveAttribute("tabindex", "0");
  });
});
