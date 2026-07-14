import { useQuery } from "@tanstack/react-query";
import { themeListSnippets, themeReadPywal } from "./ipc";

/**
 * The snippet file names in the open vault (empty while no vault is open).
 * Queries under ["theme", ...] are invalidated when the watcher reports
 * changes in .studium/themes/ (see App.tsx), so hand-edits reload live.
 */
export function useSnippetList() {
  return useQuery({
    queryKey: ["theme", "snippets"],
    queryFn: themeListSnippets,
  });
}

/**
 * The pywal palette, fetched only while pywal is the selected source.
 * Shared (by key) between the vars layer and the themes config section,
 * which shows the error state.
 */
export function usePywalPalette(enabled: boolean) {
  return useQuery({
    queryKey: ["theme", "pywal"],
    queryFn: themeReadPywal,
    enabled,
  });
}
