import { useContext } from "react";
import type { PageDef, PageId } from "../pages/pages";
import { SettingsContext } from "./settingsContext";
import { GearIcon } from "./icons";

interface TopBarProps {
  pages: PageDef[];
  activeId: PageId;
  onSelect: (id: PageId) => void;
}

export function TopBar({ pages, activeId, onSelect }: TopBarProps) {
  const openSettings = useContext(SettingsContext);

  return (
    <header className="top-bar">
      <nav className="top-bar-nav" aria-label="pages">
        {pages.map((p) => (
          <button
            key={p.id}
            className={`top-bar-item${p.id === activeId ? " is-active" : ""}`}
            aria-current={p.id === activeId ? "page" : undefined}
            title={`${p.title} (${p.combo})`}
            onClick={() => onSelect(p.id)}
          >
            <p.Icon />
            <span className="top-bar-label">{p.title}</span>
          </button>
        ))}
      </nav>
      <button
        className="top-bar-item top-bar-settings"
        aria-label="vault settings"
        title="vault settings"
        onClick={openSettings}
      >
        <GearIcon />
        <span className="top-bar-label">vault</span>
      </button>
    </header>
  );
}
