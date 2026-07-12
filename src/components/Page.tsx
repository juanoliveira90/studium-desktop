import type { ReactNode } from "react";

interface PageProps {
  /** Names the page for keyboard navigation (aria-label); not rendered. */
  title: string;
  children: ReactNode;
}

export function Page({ title, children }: PageProps) {
  return (
    <section className="page" tabIndex={0} aria-label={title}>
      <div className="page-body">{children}</div>
    </section>
  );
}
