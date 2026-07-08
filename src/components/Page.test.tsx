import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Page } from "./Page";
import { SettingsContext } from "./settingsContext";

describe("Page", () => {
  it("renders the title as a heading", () => {
    render(
      <Page title="notes">
        <p>body</p>
      </Page>,
    );

    expect(screen.getByRole("heading", { name: "notes" })).toBeInTheDocument();
  });

  it("renders children inside the page body", () => {
    render(
      <Page title="plans">
        <span>some page content</span>
      </Page>,
    );

    expect(screen.getByText("some page content")).toBeInTheDocument();
  });

  it("replaces the default heading when a custom header is provided", () => {
    render(
      <Page title="week" header={<h2>custom header</h2>}>
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
      <Page title="home">
        <p>body</p>
      </Page>,
    );

    const page = screen.getByRole("region", { name: "home" });
    expect(page).toHaveAttribute("tabindex", "0");
  });

  it("opens vault settings from the title-row button", async () => {
    const user = userEvent.setup();
    const openSettings = vi.fn();
    render(
      <SettingsContext.Provider value={openSettings}>
        <Page title="home">
          <p>body</p>
        </Page>
      </SettingsContext.Provider>,
    );

    await user.click(screen.getByRole("button", { name: "vault settings" }));

    expect(openSettings).toHaveBeenCalled();
  });
});
