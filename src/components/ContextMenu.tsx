import { useEffect, useState, type ReactNode } from "react";

// The `useContextMenu` hook lives in its own file so this module exports only
// a component (keeps react-refresh happy).

export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
  /** Renders as destructive; when set, requires a second click showing this
   *  label before firing (mirrors the vault "delete files" confirm). */
  confirmLabel?: string;
}

/**
 * A cursor-anchored right-click menu. A full-screen backdrop closes it on any
 * outside click, right-click, or Escape. Destructive items (those with a
 * `confirmLabel`) arm on first click and only fire on the second.
 */
export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const [armed, setArmed] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    // capture so this beats page-level escape handlers
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const clickItem = (item: ContextMenuItem) => {
    const needsConfirm = item.confirmLabel !== undefined;
    if (needsConfirm && armed !== item.label) {
      setArmed(item.label);
      return;
    }
    item.onSelect();
    onClose();
  };

  return (
    <div
      className="context-menu-backdrop"
      data-testid="context-menu-backdrop"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <ul
        className="context-menu"
        role="menu"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item) => {
          const isArmed = armed === item.label;
          const danger = item.confirmLabel !== undefined;
          const label: ReactNode = isArmed ? item.confirmLabel : item.label;
          return (
            <li key={item.label} role="none">
              <button
                role="menuitem"
                className={`context-menu-item${danger ? " is-danger" : ""}`}
                onClick={() => clickItem(item)}
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
