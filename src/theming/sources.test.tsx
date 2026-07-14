import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeVarsLayer } from "./sources";
import { ThemeSettingsContext, type ThemeSettings } from "./themeSettings";
import * as ipc from "./ipc";

vi.mock("./ipc");

const palette: ipc.PywalPalette = {
  background: "#101010",
  foreground: "#e0e0e0",
  cursor: "#e0e0e0",
  colors: Array.from({ length: 16 }, (_, i) => `#1111${i.toString(16)}${i.toString(16)}`),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ipc.onThemeChanged).mockReturnValue(() => {});
  document.getElementById("studium-theme-vars")?.remove();
});

function varsText(): string {
  return document.getElementById("studium-theme-vars")?.textContent ?? "";
}

function renderLayer(themeId: string) {
  const theme: ThemeSettings = {
    themeId,
    setThemeId: vi.fn(),
    enabledSnippets: [],
    toggleSnippet: vi.fn(),
  };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ThemeSettingsContext.Provider value={theme}>
        <ThemeVarsLayer />
      </ThemeSettingsContext.Provider>
    </QueryClientProvider>,
  );
}

describe("ThemeVarsLayer", () => {
  it("applies a built-in theme's vars without touching the ipc", () => {
    renderLayer("gruvbox-dark");

    expect(varsText()).toContain("--bg: #282828;");
    expect(ipc.themeReadPywal).not.toHaveBeenCalled();
  });

  it("applies no overrides for the default theme", () => {
    renderLayer("solarized-light");

    expect(varsText()).toBe("");
  });

  it("fetches, maps and applies the pywal palette when selected", async () => {
    vi.mocked(ipc.themeReadPywal).mockResolvedValue(palette);

    renderLayer("pywal");

    await waitFor(() => expect(varsText()).toContain("--bg: #101010;"));
    expect(varsText()).toContain("--fg: #e0e0e0;");
  });

  it("falls back to the default theme when pywal cannot be read", async () => {
    vi.mocked(ipc.themeReadPywal).mockRejectedValue(
      new Error("colors.json: no such file"),
    );

    renderLayer("pywal");

    await waitFor(() => expect(ipc.themeReadPywal).toHaveBeenCalled());
    expect(varsText()).toBe("");
  });

  it("refetches and retints when the theme source changes on disk", async () => {
    let onChange: ((source: string) => void) | undefined;
    vi.mocked(ipc.onThemeChanged).mockImplementation((cb) => {
      onChange = cb;
      return () => {};
    });
    vi.mocked(ipc.themeReadPywal).mockResolvedValue(palette);

    renderLayer("pywal");
    await waitFor(() => expect(varsText()).toContain("--bg: #101010;"));

    vi.mocked(ipc.themeReadPywal).mockResolvedValue({
      ...palette,
      background: "#202020",
    });
    onChange?.("pywal");

    await waitFor(() => expect(varsText()).toContain("--bg: #202020;"));
  });
});
