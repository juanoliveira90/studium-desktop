import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VaultSettingsModal } from "./VaultSettingsModal";
import * as ipc from "./ipc";

vi.mock("./ipc");

const VAULTS = ["/vaults/study", "/vaults/work"];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ipc.vaultDefaultPath).mockResolvedValue("/vaults/study");
  vi.mocked(ipc.vaultOpen).mockImplementation(async (path) => ({ root: path }));
  vi.mocked(ipc.vaultCreate).mockResolvedValue({ root: "/vaults/new" });
  vi.mocked(ipc.vaultListKnown).mockResolvedValue(VAULTS);
  vi.mocked(ipc.vaultForget).mockResolvedValue(["/vaults/study"]);
  vi.mocked(ipc.vaultDelete).mockResolvedValue(["/vaults/study"]);
  vi.mocked(ipc.pickFolder).mockResolvedValue(null);
});

function renderModal(onClose = vi.fn()) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <VaultSettingsModal onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
}

describe("VaultSettingsModal", () => {
  it("lists the known vaults and marks the current one", async () => {
    renderModal();

    expect(await screen.findByRole("button", { name: "/vaults/work" })).toBeInTheDocument();
    const current = await screen.findByRole("button", { name: /^\/vaults\/study/ });
    expect(current).toHaveAttribute("aria-current", "true");
  });

  it("switches to a vault on click and closes", async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    await user.click(await screen.findByRole("button", { name: "/vaults/work" }));

    await waitFor(() => expect(ipc.vaultOpen).toHaveBeenCalledWith("/vaults/work"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("creates a new vault in a picked folder", async () => {
    const user = userEvent.setup();
    vi.mocked(ipc.pickFolder).mockResolvedValue("/vaults/new");
    const onClose = renderModal();

    await user.click(await screen.findByRole("button", { name: /new vault/ }));

    await waitFor(() => expect(ipc.vaultCreate).toHaveBeenCalledWith("/vaults/new"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("opens an existing folder as a vault", async () => {
    const user = userEvent.setup();
    vi.mocked(ipc.pickFolder).mockResolvedValue("/vaults/elsewhere");
    const onClose = renderModal();

    await user.click(await screen.findByRole("button", { name: /open folder/ }));

    await waitFor(() => expect(ipc.vaultOpen).toHaveBeenCalledWith("/vaults/elsewhere"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("does nothing when the folder picker is cancelled", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole("button", { name: /new vault/ }));

    await waitFor(() => expect(ipc.pickFolder).toHaveBeenCalled());
    expect(ipc.vaultCreate).not.toHaveBeenCalled();
  });

  it("forgets a vault after confirming", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole("button", { name: "remove /vaults/work" }));
    await user.click(screen.getByRole("button", { name: /forget/ }));

    await waitFor(() => expect(ipc.vaultForget).toHaveBeenCalledWith("/vaults/work"));
    expect(ipc.vaultDelete).not.toHaveBeenCalled();
  });

  it("deletes files from disk only after a second explicit click", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole("button", { name: "remove /vaults/work" }));
    await user.click(screen.getByRole("button", { name: "delete files" }));
    expect(ipc.vaultDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /really delete files/ }));

    await waitFor(() => expect(ipc.vaultDelete).toHaveBeenCalledWith("/vaults/work"));
  });

  it("cancel backs out of the confirm row", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(await screen.findByRole("button", { name: "remove /vaults/work" }));
    await user.click(screen.getByRole("button", { name: /cancel/ }));

    expect(screen.queryByRole("button", { name: /forget/ })).not.toBeInTheDocument();
    expect(ipc.vaultForget).not.toHaveBeenCalled();
  });

  it("closes on Escape and on overlay click, and focuses itself on mount", async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveFocus());

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("shows mutation errors", async () => {
    const user = userEvent.setup();
    vi.mocked(ipc.vaultForget).mockRejectedValue(new Error("config unwritable"));
    renderModal();

    await user.click(await screen.findByRole("button", { name: "remove /vaults/work" }));
    await user.click(screen.getByRole("button", { name: /forget/ }));

    expect(await screen.findByText(/config unwritable/)).toBeInTheDocument();
  });
});
