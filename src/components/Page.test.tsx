import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Page } from "./Page";

describe("Page", () => {
  it("renders children inside the page body", () => {
    render(
      <Page title="plans">
        <span>some page content</span>
      </Page>,
    );

    expect(screen.getByText("some page content")).toBeInTheDocument();
  });

  it("shows no visible title — the top bar already names the page", () => {
    render(
      <Page title="notes">
        <p>body</p>
      </Page>,
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByText("notes")).not.toBeInTheDocument();
  });

  it("is focusable and labelled by its title for keyboard navigation", () => {
    render(
      <Page title="home">
        <p>body</p>
      </Page>,
    );

    const page = screen.getByRole("region", { name: "home" });
    expect(page).toHaveAttribute("tabindex", "0");
  });
});
