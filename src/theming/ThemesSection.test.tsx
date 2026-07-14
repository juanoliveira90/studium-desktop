import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemesSection } from "./ThemesSection";
import { ThemeSettingsContext, type ThemeSettings } from "./themeSettings";
import { BUILTIN_THEMES } from "./builtins";
import * as ipc from "./ipc";

vi.mock("./ipc");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ipc.themeListSnippets).mockResolvedValue([]);
});

function renderSection(overrides: Partial<ThemeSettings> = {}) {
  const theme: ThemeSettings = {
    themeId: "solarized-light",
    setThemeId: vi.fn(),
    enabledSnippets: [],
    toggleSnippet: vi.fn(),
    ...overrides,
  };
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <ThemeSettingsContext.Provider value={theme}>
        <ThemesSection />
      </ThemeSettingsContext.Provider>
    </QueryClientProvider>,
  );
  return theme;
}

describe("ThemesSection", () => {
  it("offers every built-in theme with the current one checked", () => {
    renderSection({ themeId: "nord" });

    const group = screen.getByRole("group", { name: "theme" });
    expect(group).toBeInTheDocument();
    for (const builtin of BUILTIN_THEMES) {
      expect(
        screen.getByRole("radio", { name: builtin.label }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "nord" })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "solarized light" }),
    ).not.toBeChecked();
  });

  it("selects a theme on click", async () => {
    const user = userEvent.setup();
    const theme = renderSection();

    await user.click(screen.getByRole("radio", { name: "rose pine" }));

    expect(theme.setThemeId).toHaveBeenCalledWith("rose-pine");
  });

  it("offers pywal as a source and selects it", async () => {
    const user = userEvent.setup();
    const theme = renderSection();

    await user.click(screen.getByRole("radio", { name: "pywal" }));

    expect(theme.setThemeId).toHaveBeenCalledWith("pywal");
  });

  it("offers base16 with a scheme path input when selected", async () => {
    vi.mocked(ipc.configGetBase16Path).mockResolvedValue(
      "/home/u/scheme.yaml",
    );
    vi.mocked(ipc.themeReadBase16).mockResolvedValue({ palette: [] });
    renderSection({ themeId: "base16" });

    expect(screen.getByRole("radio", { name: "base16" })).toBeChecked();
    // The field mounts empty and re-keys once the configured path loads.
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "base16 yaml path" }),
      ).toHaveValue("/home/u/scheme.yaml"),
    );
  });

  it("saves the base16 path on Enter", async () => {
    vi.mocked(ipc.configGetBase16Path).mockResolvedValue(null);
    vi.mocked(ipc.configSetBase16Path).mockResolvedValue(undefined);
    vi.mocked(ipc.themeReadBase16).mockResolvedValue({ palette: [] });
    const user = userEvent.setup();
    renderSection({ themeId: "base16" });

    const input = await screen.findByRole("textbox", {
      name: "base16 yaml path",
    });
    await user.type(input, "/tmp/scheme.yaml{Enter}");

    expect(ipc.configSetBase16Path).toHaveBeenCalledWith("/tmp/scheme.yaml");
  });

  it("shows the base16 read error inline when selected but broken", async () => {
    vi.mocked(ipc.configGetBase16Path).mockResolvedValue(null);
    vi.mocked(ipc.themeReadBase16).mockRejectedValue(
      new Error("no base16 file configured"),
    );
    renderSection({ themeId: "base16" });

    expect(
      await screen.findByText(/no base16 file configured/),
    ).toBeInTheDocument();
  });

  it("shows the pywal read error inline when pywal is selected but broken", async () => {
    vi.mocked(ipc.themeReadPywal).mockRejectedValue(
      new Error("colors.json: no such file — run wal first"),
    );
    renderSection({ themeId: "pywal" });

    expect(screen.getByRole("radio", { name: "pywal" })).toBeChecked();
    expect(
      await screen.findByText(/colors\.json: no such file/),
    ).toBeInTheDocument();
  });

  it("lists user css snippets with the enabled ones checked", async () => {
    vi.mocked(ipc.themeListSnippets).mockResolvedValue(["a.css", "b.css"]);
    renderSection({ enabledSnippets: ["b.css"] });

    expect(await screen.findByRole("checkbox", { name: "a.css" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "b.css" })).toBeChecked();
  });

  it("toggles a snippet on click", async () => {
    vi.mocked(ipc.themeListSnippets).mockResolvedValue(["a.css"]);
    const user = userEvent.setup();
    const theme = renderSection();

    await user.click(await screen.findByRole("checkbox", { name: "a.css" }));

    expect(theme.toggleSnippet).toHaveBeenCalledWith("a.css");
  });

  it("shows an empty state when the vault has no snippets", async () => {
    renderSection();

    expect(
      await screen.findByText("no snippets in .studium/themes/"),
    ).toBeInTheDocument();
  });
});
