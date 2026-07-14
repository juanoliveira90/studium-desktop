import { useContext } from "react";
import type { PageDef, PageId } from "../pages/pages";
import { SettingsContext } from "./settingsContext";
import { useUiSettings } from "../config/uiSettings";
import { GearIcon } from "./icons";

interface TopBarProps {
  pages: PageDef[];
  activeId: PageId;
  onSelect: (id: PageId) => void;
}

export function TopBar({ pages, activeId, onSelect }: TopBarProps) {
  const openSettings = useContext(SettingsContext);
  const { showLabels } = useUiSettings();

  return (
    <header className="top-bar">
      <nav className="top-bar-nav" aria-label="pages">
        {pages.map((p) => (
          <button
            key={p.id}
            className={`top-bar-item${p.id === activeId ? " is-active" : ""}`}
            aria-current={p.id === activeId ? "page" : undefined}
            aria-label={p.title}
            title={`${p.title} (${p.combo})`}
            onClick={() => onSelect(p.id)}
          >
            <p.Icon />
            {showLabels && <span className="top-bar-label">{p.title}</span>}
          </button>
        ))}
      </nav>
      <button
        className="top-bar-item top-bar-settings"
        aria-label="config"
        title="config"
        onClick={openSettings}
      >
        <GearIcon />
        {showLabels && <span className="top-bar-label">config</span>}
      </button>
    </header>
  );
}
