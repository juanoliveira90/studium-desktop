import { useEffect, useRef, useState } from "react";
import { VaultSection } from "../vault/VaultSection";
import { CustomizationSection } from "./CustomizationSection";
import { ThemesSection } from "../theming/ThemesSection";

const SECTIONS = ["vault", "customization", "themes"] as const;
type Section = (typeof SECTIONS)[number];

/** App configuration overlay: a sidebar of sections (vault, customization, themes). */
export function ConfigModal({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<Section>("vault");

  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => dialogRef.current?.focus(), []);

  return (
    <div className="modal-overlay" data-testid="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal modal-config"
        role="dialog"
        aria-modal="true"
        aria-label="config"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="config-body">
          <nav className="config-sidebar" aria-label="config sections">
            {SECTIONS.map((s) => (
              <button
                key={s}
                className={`config-sidebar-item${s === section ? " is-active" : ""}`}
                aria-current={s === section || undefined}
                onClick={() => setSection(s)}
              >
                {s}
              </button>
            ))}
          </nav>
          <div className="config-content">
            {section === "vault" ? (
              <VaultSection onClose={onClose} />
            ) : section === "customization" ? (
              <CustomizationSection />
            ) : (
              <ThemesSection />
            )}
          </div>
        </div>
        <p className="muted modal-hint">esc close</p>
      </div>
    </div>
  );
}
