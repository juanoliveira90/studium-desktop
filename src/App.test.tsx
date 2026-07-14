import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as ipc from "./vault/ipc";
import * as themeIpc from "./theming/ipc";

vi.mock("./vault/ipc");
vi.mock("./theming/ipc");

beforeEach(() => {
  localStorage.clear();
  vi.mocked(themeIpc.themeListSnippets).mockResolvedValue([]);
  vi.mocked(themeIpc.onThemeChanged).mockReturnValue(() => {});
  vi.mocked(ipc.vaultDefaultPath).mockResolvedValue("/vault");
  vi.mocked(ipc.vaultOpen).mockResolvedValue({ root: "/vault" });
  vi.mocked(ipc.docList).mockResolvedValue([]);
  vi.mocked(ipc.scheduleList).mockResolvedValue([]);
  vi.mocked(ipc.onVaultChanged).mockReturnValue(() => {});
  vi.mocked(ipc.vaultListKnown).mockResolvedValue(["/vault"]);
});

describe("App", () => {
  it("shows the home page by default", () => {
    render(<App />);

    expect(screen.getByRole("region", { name: "home" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "studium" })).toBeInTheDocument();
  });

  it("switches pages with Alt+number", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard("{Alt>}4{/Alt}");
    expect(screen.getByRole("region", { name: "weekly routine" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "home" })).not.toBeInTheDocument();

    await user.keyboard("{Alt>}1{/Alt}");
    expect(screen.getByRole("region", { name: "home" })).toBeInTheDocument();
  });

  it("switches pages by clicking the top bar", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "notes" }));

    expect(screen.getByRole("region", { name: "notes" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "notes" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("switches pages while a text input has focus", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.keyboard("{Alt>}2{/Alt}");
    await user.click(await screen.findByRole("textbox", { name: "search notes" }));
    await user.keyboard("{Alt>}3{/Alt}");

    expect(
      screen.getByRole("region", { name: "study plan" }),
    ).toBeInTheDocument();
  });

  it("opens the config modal from the top bar and closes it on Escape", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "config" }));
    const dialog = await screen.findByRole("dialog", { name: "config" });
    await waitFor(() => expect(dialog).toHaveFocus());

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("defaults to a top bar with labels shown", () => {
    const { container } = render(<App />);

    const app = container.querySelector(".app")!;
    expect(app).toHaveAttribute("data-bar-position", "top");
    expect(app).toHaveAttribute("data-labels", "shown");
  });

  it("applies a persisted bar position on startup", () => {
    localStorage.setItem("studium.ui.barPosition", "left");
    const { container } = render(<App />);

    expect(container.querySelector(".app")).toHaveAttribute(
      "data-bar-position",
      "left",
    );
  });

  it("repositions the bar and hides labels from the customization section", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const app = container.querySelector(".app")!;

    await user.click(screen.getByRole("button", { name: "config" }));
    await user.click(screen.getByRole("button", { name: "customization" }));

    await user.click(screen.getByRole("radio", { name: "bottom" }));
    expect(app).toHaveAttribute("data-bar-position", "bottom");
    expect(localStorage.getItem("studium.ui.barPosition")).toBe("bottom");

    await user.click(screen.getByRole("checkbox", { name: "show labels" }));
    expect(app).toHaveAttribute("data-labels", "hidden");
    expect(container.querySelectorAll(".top-bar-label")).toHaveLength(0);
    expect(localStorage.getItem("studium.ui.showLabels")).toBe("false");
  });
});
