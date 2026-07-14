import { BUILTIN_THEMES } from "./builtins";
import {
  useBase16Palette,
  useBase16Path,
  usePywalPalette,
  useSetBase16Path,
  useSnippetList,
} from "./useSnippets";
import { useThemeSettings } from "./themeSettings";

/** Themes section of the config modal: color theme + user CSS snippets. */
export function ThemesSection() {
  const theme = useThemeSettings();
  const snippets = useSnippetList();
  const snippetNames = snippets.data ?? [];

  const isPywal = theme.themeId === "pywal";
  const pywal = usePywalPalette(isPywal);
  const pywalError = isPywal && pywal.isError ? String(pywal.error) : null;

  const isBase16 = theme.themeId === "base16";
  const base16 = useBase16Palette(isBase16);
  const base16Error = isBase16 && base16.isError ? String(base16.error) : null;
  const base16Path = useBase16Path();
  const setBase16Path = useSetBase16Path();

  const commitBase16Path = (raw: string) => {
    const trimmed = raw.trim();
    const current = base16Path.data ?? null;
    const next = trimmed === "" ? null : trimmed;
    if (next !== current) setBase16Path.mutate(next);
  };

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
        <label className="config-option">
          <input
            type="radio"
            name="theme"
            value="pywal"
            checked={isPywal}
            onChange={() => theme.setThemeId("pywal")}
          />
          pywal
        </label>
        {pywalError && <p className="muted">{pywalError}</p>}
        <label className="config-option">
          <input
            type="radio"
            name="theme"
            value="base16"
            checked={isBase16}
            onChange={() => theme.setThemeId("base16")}
          />
          base16
        </label>
        {isBase16 && (
          <input
            key={base16Path.data ?? ""}
            className="config-path-input"
            type="text"
            aria-label="base16 yaml path"
            placeholder="/path/to/scheme.yaml"
            defaultValue={base16Path.data ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitBase16Path(e.currentTarget.value);
            }}
            onBlur={(e) => commitBase16Path(e.target.value)}
          />
        )}
        {base16Error && <p className="muted">{base16Error}</p>}
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
