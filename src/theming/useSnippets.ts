import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  configGetBase16Path,
  configSetBase16Path,
  themeListSnippets,
  themeReadBase16,
  themeReadPywal,
} from "./ipc";

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

/** The base16 scheme, fetched only while base16 is the selected source. */
export function useBase16Palette(enabled: boolean) {
  return useQuery({
    queryKey: ["theme", "base16"],
    queryFn: themeReadBase16,
    enabled,
  });
}

/** The configured base16 yaml path (null = unset). */
export function useBase16Path() {
  return useQuery({
    queryKey: ["theme", "base16-path"],
    queryFn: configGetBase16Path,
  });
}

/** Saves the base16 yaml path, then refetches the path and the scheme. */
export function useSetBase16Path() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (path: string | null) => configSetBase16Path(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theme", "base16-path"] });
      queryClient.invalidateQueries({ queryKey: ["theme", "base16"] });
    },
  });
}
