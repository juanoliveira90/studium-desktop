import { BUILTIN_THEMES } from "./builtins";
import { useSnippetList } from "./useSnippets";
import { useThemeSettings } from "./themeSettings";

/** Themes section of the config modal: color theme + user CSS snippets. */
export function ThemesSection() {
  const theme = useThemeSettings();
  const snippets = useSnippetList();
  const snippetNames = snippets.data ?? [];

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
      <fieldset className="config-field">
        <legend>user css</legend>
        {snippetNames.length === 0 ? (
          <p className="muted">no snippets in .studium/themes/</p>
        ) : (
          snippetNames.map((name) => (
            <label key={name} className="config-option">
              <input
                type="checkbox"
                checked={theme.enabledSnippets.includes(name)}
                onChange={() => theme.toggleSnippet(name)}
              />
              {name}
            </label>
          ))
        )}
      </fieldset>
    </>
  );
}
