import type { ReactNode } from "react";

interface PageProps {
  title: string;
  hint: string;
  /** Extra content rendered in the title row (e.g. week navigation). */
  header?: ReactNode;
  children: ReactNode;
}

export function Page({ title, hint, header, children }: PageProps) {
  return (
    <section className="page" tabIndex={0} aria-label={title}>
      <div className="page-title">
        {header ?? <h2>{title}</h2>}
        <span className="hint">({hint})</span>
      </div>
      <div className="page-body">{children}</div>
    </section>
  );
}
