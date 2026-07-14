import { BUILTIN_THEMES } from "./builtins";
import { useThemeSettings } from "./themeSettings";

/** Themes section of the config modal: pick the active color theme. */
export function ThemesSection() {
  const theme = useThemeSettings();

  return (
    <>
      <p className="modal-title">themes</p>
      <fieldset className="config-field">
        <legend>theme</legend>
        {BUILTIN_THEMES.map((builtin) => (
          <label key={builtin.id} className="config-option">
            <input
              type="radio"
              name="theme"
              value={builtin.id}
              checked={theme.themeId === builtin.id}
              onChange={() => theme.setThemeId(builtin.id)}
            />
            {builtin.label}
          </label>
        ))}
      </fieldset>
    </>
  );
}
