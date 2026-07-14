import { useQuery } from "@tanstack/react-query";
import { themeListSnippets } from "./ipc";

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
