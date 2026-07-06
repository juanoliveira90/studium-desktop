import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Page } from "./Page";

describe("Page", () => {
  it("renders the title as a heading with its keyboard hint", () => {
    render(
      <Page title="notes" hint="alt+2">
        <p>body</p>
      </Page>,
    );

    expect(screen.getByRole("heading", { name: "notes" })).toBeInTheDocument();
    expect(screen.getByText("(alt+2)")).toBeInTheDocument();
  });

  it("renders children inside the page body", () => {
    render(
      <Page title="plans" hint="alt+3">
        <span>some page content</span>
      </Page>,
    );

    expect(screen.getByText("some page content")).toBeInTheDocument();
  });

  it("replaces the default heading when a custom header is provided", () => {
    render(
      <Page title="week" hint="alt+4" header={<h2>custom header</h2>}>
        <p>body</p>
      </Page>,
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
      <Page title="home" hint="alt+1">
        <p>body</p>
      </Page>,
    );

    const page = screen.getByRole("region", { name: "home" });
    expect(page).toHaveAttribute("tabindex", "0");
  });
});
