import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useKeymap } from "./keyboard/useKeymap";
import { TopBar } from "./components/TopBar";
import { SettingsContext } from "./components/settingsContext";
import { PAGES, type PageId } from "./pages/pages";
import { onVaultChanged } from "./vault/ipc";
import { ConfigModal } from "./config/ConfigModal";
import { UiSettingsContext, useUiSettingsState } from "./config/uiSettings";
import {
  ThemeSettingsContext,
  useThemeSettingsState,
} from "./theming/themeSettings";

function App() {
  const [active, setActive] = useState<PageId>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ui = useUiSettingsState();
  const theme = useThemeSettingsState();
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );

  // Hand-edits picked up by the vault watcher refresh every doc query, so
  // changes made in vim/Obsidian appear live.
  useEffect(
    () =>
      onVaultChanged(() => {
        queryClient.invalidateQueries({ queryKey: ["docs"] });
      }),
    [queryClient],
  );

  useKeymap(
    useMemo(
      () =>
        PAGES.map((p) => ({
          combo: p.combo,
          id: `goto.${p.id}`,
          run: () => setActive(p.id),
        })),
      [],
    ),
  );

  // Only the active page mounts; transient page state (e.g. text typed in a
  // search field) is lost on switch — fine while pages are static mock data.
  const { Component } = PAGES.find((p) => p.id === active)!;

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsContext.Provider value={() => setSettingsOpen(true)}>
        <UiSettingsContext.Provider value={ui}>
          <ThemeSettingsContext.Provider value={theme}>
            <div
              className="app"
              data-bar-position={ui.barPosition}
              data-labels={ui.showLabels ? "shown" : "hidden"}
            >
              <TopBar pages={PAGES} activeId={active} onSelect={setActive} />
              <main className="page-container">
                <Component />
              </main>
            </div>
            {settingsOpen && (
              <ConfigModal onClose={() => setSettingsOpen(false)} />
            )}
          </ThemeSettingsContext.Provider>
        </UiSettingsContext.Provider>
      </SettingsContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
