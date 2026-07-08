import { useState } from "react";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";

/**
 * State plus render helper for a single context menu shared across a page.
 * `open(event, items)` positions it at the cursor; `menu` is the element to
 * drop into the tree (null when closed).
 */
export function useContextMenu() {
  const [state, setState] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const open = (e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    setState({ x: e.clientX, y: e.clientY, items });
  };

  const close = () => setState(null);

  const menu = state ? (
    <ContextMenu x={state.x} y={state.y} items={state.items} onClose={close} />
  ) : null;

  return { menu, open };
}
