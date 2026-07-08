import { useContext, type ReactNode } from "react";
import { SettingsContext } from "./settingsContext";

interface PageProps {
  title: string;
  /** Extra content rendered in the title row (e.g. week navigation). */
  header?: ReactNode;
  children: ReactNode;
}

export function Page({ title, header, children }: PageProps) {
  const openSettings = useContext(SettingsContext);

  return (
    <section className="page" tabIndex={0} aria-label={title}>
      <div className="page-title">
        {header ?? <h2>{title}</h2>}
        <button
          className="page-settings"
          aria-label="vault settings"
          onClick={openSettings}
        >
          ⚙ vault
        </button>
      </div>
      <div className="page-body">{children}</div>
    </section>
  );
}
