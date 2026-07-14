import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeSnippetLayer } from "./snippets";
import { ThemeSettingsContext, type ThemeSettings } from "./themeSettings";
import * as ipc from "./ipc";

vi.mock("./ipc");

beforeEach(() => {
  vi.clearAllMocks();
  document
    .querySelectorAll("style[data-theme-snippet], #studium-theme-vars")
    .forEach((el) => el.remove());
});

function renderLayer(enabledSnippets: string[]) {
  const theme: ThemeSettings = {
    themeId: "solarized-light",
    setThemeId: vi.fn(),
    enabledSnippets,
    toggleSnippet: vi.fn(),
  };
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <ThemeSettingsContext.Provider value={theme}>
        <ThemeSnippetLayer />
      </ThemeSettingsContext.Provider>
    </QueryClientProvider>,
  );
}

describe("ThemeSnippetLayer", () => {
  it("injects only the enabled snippets that exist, in vault order", async () => {
    vi.mocked(ipc.themeListSnippets).mockResolvedValue([
      "a.css",
      "b.css",
      "gone.css",
    ]);
    vi.mocked(ipc.themeReadSnippet).mockImplementation(async (name) => {
      return `/* ${name} */`;
    });

    renderLayer(["b.css", "a.css", "stale.css"]);

    await waitFor(() => {
      const snippets = [
        ...document.head.querySelectorAll("style[data-theme-snippet]"),
      ] as HTMLElement[];
      expect(snippets.map((s) => s.dataset.themeSnippet)).toEqual([
        "a.css",
        "b.css",
      ]);
    });
    expect(ipc.themeReadSnippet).not.toHaveBeenCalledWith("stale.css");
    expect(ipc.themeReadSnippet).not.toHaveBeenCalledWith("gone.css");
  });

  it("injects nothing when the vault has no snippets or the list fails", async () => {
    vi.mocked(ipc.themeListSnippets).mockRejectedValue(
      new Error("no vault is open"),
    );

    renderLayer(["a.css"]);

    await waitFor(() => expect(ipc.themeListSnippets).toHaveBeenCalled());
    expect(
      document.head.querySelectorAll("style[data-theme-snippet]"),
    ).toHaveLength(0);
  });
});
