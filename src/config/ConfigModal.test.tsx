import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigModal } from "./ConfigModal";
import * as ipc from "../vault/ipc";

vi.mock("../vault/ipc");

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(ipc.vaultDefaultPath).mockResolvedValue("/vaults/study");
  vi.mocked(ipc.vaultListKnown).mockResolvedValue(["/vaults/study"]);
});

function renderModal(onClose = vi.fn()) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <ConfigModal onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
}

describe("ConfigModal", () => {
  it("closes on Escape and on overlay click, and focuses itself on mount", async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    const dialog = await screen.findByRole("dialog", { name: "config" });
    await waitFor(() => expect(dialog).toHaveFocus());

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does not close on clicks inside the dialog", async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    await user.click(await screen.findByRole("dialog", { name: "config" }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the vault section by default with a sidebar of sections", async () => {
    renderModal();

    const sidebar = screen.getByRole("navigation", { name: "config sections" });
    expect(sidebar).toBeInTheDocument();
    const vaultTab = screen.getByRole("button", { name: "vault" });
    expect(vaultTab).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "customization" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(await screen.findByRole("button", { name: /^\/vaults\/study/ })).toBeInTheDocument();
  });

  it("switches to the themes section from the sidebar", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "themes" }));

    expect(screen.getByRole("button", { name: "themes" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("group", { name: "theme" })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "solarized light" }),
    ).toBeInTheDocument();
  });

  it("switches to the customization section from the sidebar", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "customization" }));

    expect(screen.getByRole("button", { name: "customization" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("group", { name: "bar position" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "show labels" })).toBeInTheDocument();
    expect(screen.queryByText("vaults")).not.toBeInTheDocument();
  });
});
