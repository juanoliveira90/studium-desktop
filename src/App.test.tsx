import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as ipc from "./vault/ipc";

vi.mock("./vault/ipc");

beforeEach(() => {
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

  it("switches pages by clicking the status bar", async () => {
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

  it("opens the vault settings modal from the status bar and closes it on Escape", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "vault settings" }));
    const dialog = await screen.findByRole("dialog", { name: "vault settings" });
    await waitFor(() => expect(dialog).toHaveFocus());

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
