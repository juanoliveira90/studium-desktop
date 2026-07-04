import type { ReactNode } from "react";

interface PaneProps {
  title: string;
  hint: string;
  /** Extra content rendered in the title row (e.g. week navigation). */
  header?: ReactNode;
  children: ReactNode;
}

export function Pane({ title, hint, header, children }: PaneProps) {
  return (
    <section className="pane" tabIndex={0} aria-label={title}>
      <div className="pane-title">
        {header ?? <h2>{title}</h2>}
        <span className="hint">({hint})</span>
      </div>
      <div className="pane-body">{children}</div>
    </section>
  );
}
