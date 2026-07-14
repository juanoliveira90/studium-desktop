import { useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { themeReadSnippet } from "./ipc";
import { applySnippets, type Snippet } from "./inject";
import { useThemeSettings } from "./themeSettings";
import { useSnippetList } from "./useSnippets";

/**
 * Invisible app-shell layer that keeps the injected snippet styles in sync
 * with the enabled set and the vault's contents. The vault (via Rust) is
 * the source of truth for which snippets exist; the enabled set lives in
 * the theme settings.
 */
export function ThemeSnippetLayer() {
  const { enabledSnippets } = useThemeSettings();
  const list = useSnippetList();

  // Vault order (sorted names), restricted to what exists AND is enabled —
  // stale localStorage entries and deleted files drop out here.
  const active = (list.data ?? []).filter((name) =>
    enabledSnippets.includes(name),
  );

  const contents = useQueries({
    queries: active.map((name) => ({
      queryKey: ["theme", "snippet", name],
      queryFn: () => themeReadSnippet(name),
    })),
  });

  const loaded: Snippet[] = [];
  contents.forEach((query, index) => {
    if (typeof query.data === "string") {
      loaded.push({ name: active[index], css: query.data });
    }
  });

  // applySnippets replaces a handful of <style> elements; running it on
  // every render of this leaf component is cheaper than diffing.
  useEffect(() => {
    applySnippets(loaded);
  });

  return null;
}
