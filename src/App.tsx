import { useMemo, useState } from "react";
import { useKeymap } from "./keyboard/useKeymap";
import { StatusBar } from "./components/StatusBar";
import { PAGES, type PageId } from "./pages/pages";

function App() {
  const [active, setActive] = useState<PageId>("home");

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
    <div className="app">
      <main className="page-container">
        <Component />
      </main>
      <StatusBar pages={PAGES} activeId={active} onSelect={setActive} />
    </div>
  );
}

export default App;
