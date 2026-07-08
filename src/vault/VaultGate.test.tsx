import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VaultGate } from "./VaultGate";
import * as ipc from "./ipc";

vi.mock("./ipc");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ipc.vaultOpen).mockImplementation(async (path) => ({ root: path }));
  vi.mocked(ipc.vaultCreate).mockImplementation(async (path) => ({ root: path }));
  vi.mocked(ipc.pickFolder).mockResolvedValue(null);
});

function renderGate(loadError: Error | null = null) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <VaultGate loadError={loadError} />
    </QueryClientProvider>,
  );
}

describe("VaultGate", () => {
  it("opens a picked folder as a vault", async () => {
    const user = userEvent.setup();
    vi.mocked(ipc.pickFolder).mockResolvedValue("/my/vault");
    renderGate();

    await user.click(screen.getByRole("button", { name: /open vault/ }));

    await waitFor(() => expect(ipc.vaultOpen).toHaveBeenCalledWith("/my/vault"));
    expect(ipc.vaultCreate).not.toHaveBeenCalled();
  });

  it("creates a vault in a picked folder", async () => {
    const user = userEvent.setup();
    vi.mocked(ipc.pickFolder).mockResolvedValue("/my/new-vault");
    renderGate();

    await user.click(screen.getByRole("button", { name: /create vault/ }));

    await waitFor(() => expect(ipc.vaultCreate).toHaveBeenCalledWith("/my/new-vault"));
  });

  it("does nothing when the picker is cancelled", async () => {
    const user = userEvent.setup();
    renderGate();

    await user.click(screen.getByRole("button", { name: /open vault/ }));

    await waitFor(() => expect(ipc.pickFolder).toHaveBeenCalled());
    expect(ipc.vaultOpen).not.toHaveBeenCalled();
  });

  it("shows load and mutation errors", async () => {
    const user = userEvent.setup();
    vi.mocked(ipc.pickFolder).mockResolvedValue("/bad");
    vi.mocked(ipc.vaultOpen).mockRejectedValue(new Error("not a vault"));
    renderGate(new Error("remembered vault missing"));

    expect(screen.getByText(/remembered vault missing/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open vault/ }));

    expect(await screen.findByText(/not a vault/)).toBeInTheDocument();
  });
});
