import type { PageDef, PageId } from "../pages/pages";

interface StatusBarProps {
  pages: PageDef[];
  activeId: PageId;
  onSelect: (id: PageId) => void;
}

export function StatusBar({ pages, activeId, onSelect }: StatusBarProps) {
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
    </nav>
  );
}
