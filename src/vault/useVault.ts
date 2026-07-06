/*
 * Vault session state: opening the remembered vault on startup and letting
 * the user open/create one by path. Query key "vault" holds the open root
 * (null = nothing remembered); doc queries live under ["docs", ...] and are
 * invalidated wholesale by the vault:changed watcher event (see App.tsx).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vaultCreate, vaultDefaultPath, vaultOpen } from "./ipc";

export function useVault() {
  return useQuery({
    queryKey: ["vault"],
    retry: false,
    queryFn: async (): Promise<string | null> => {
      const path = await vaultDefaultPath();
      if (!path) return null;
      return (await vaultOpen(path)).root;
    },
  });
}

export function useOpenVault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, create }: { path: string; create: boolean }) => {
      const info = create ? await vaultCreate(path) : await vaultOpen(path);
      return info.root;
    },
    onSuccess: (root) => {
      qc.setQueryData(["vault"], root);
      qc.invalidateQueries({ queryKey: ["docs"] });
    },
  });
}
