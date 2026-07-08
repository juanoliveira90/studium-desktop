import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useKeymap } from "./keyboard/useKeymap";
import { StatusBar } from "./components/StatusBar";
import { SettingsContext } from "./components/settingsContext";
import { PAGES, type PageId } from "./pages/pages";
import { onVaultChanged } from "./vault/ipc";
import { VaultSettingsModal } from "./vault/VaultSettingsModal";

function App() {
  const [active, setActive] = useState<PageId>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
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
        <div className="app">
          <main className="page-container">
            <Component />
          </main>
          <StatusBar pages={PAGES} activeId={active} onSelect={setActive} />
        </div>
        {settingsOpen && <VaultSettingsModal onClose={() => setSettingsOpen(false)} />}
      </SettingsContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
