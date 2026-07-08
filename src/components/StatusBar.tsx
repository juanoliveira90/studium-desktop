import type { PageDef, PageId } from "../pages/pages";

interface StatusBarProps {
  pages: PageDef[];
  activeId: PageId;
  onSelect: (id: PageId) => void;
  onSettings: () => void;
}

export function StatusBar({ pages, activeId, onSelect, onSettings }: StatusBarProps) {
  return (
    <nav className="status-bar" aria-label="pages">
      {pages.map((p) => (
        <button
          key={p.id}
          className={`status-bar-item${p.id === activeId ? " is-active" : ""}`}
          aria-current={p.id === activeId ? "page" : undefined}
          onClick={() => onSelect(p.id)}
        >
          <span className="key">{p.combo}</span> {p.title}
        </button>
      ))}
      <span className="status-bar-spacer" />
      <button
        className="status-bar-item status-bar-settings"
        aria-label="vault settings"
        onClick={onSettings}
      >
        ⚙ vault
      </button>
    </nav>
  );
}
