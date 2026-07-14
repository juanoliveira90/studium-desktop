/*
 * Vault session state: opening the remembered vault on startup and letting
 * the user open/create one by path. Query key "vault" holds the open root
 * (null = nothing remembered); doc queries live under ["docs", ...] and are
 * invalidated wholesale by the vault:changed watcher event (see App.tsx).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  vaultCreate,
  vaultDefaultPath,
  vaultDelete,
  vaultForget,
  vaultListKnown,
  vaultOpen,
} from "./ipc";

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
      qc.invalidateQueries({ queryKey: ["vaults"] });
      qc.invalidateQueries({ queryKey: ["docs"] });
      qc.invalidateQueries({ queryKey: ["theme"] });
    },
  });
}

/** Every vault the user has opened, for the settings modal's list. */
export function useKnownVaults() {
  return useQuery({ queryKey: ["vaults"], queryFn: vaultListKnown });
}

/*
 * Forget/delete both return the updated known list; invalidating ["vault"]
 * re-runs the remembered-path lookup, which lands on null (→ VaultGate)
 * when the removed vault was the open one.
 */
function useRemoveVault(remove: (path: string) => Promise<string[]>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => remove(path),
    onSuccess: (list) => {
      qc.setQueryData(["vaults"], list);
      qc.invalidateQueries({ queryKey: ["vault"] });
      qc.invalidateQueries({ queryKey: ["docs"] });
      qc.invalidateQueries({ queryKey: ["theme"] });
    },
  });
}

/** Removes a vault from the known list; its files stay on disk. */
export function useForgetVault() {
  return useRemoveVault(vaultForget);
}

/** Deletes a vault's files from disk and forgets it. */
export function useDeleteVault() {
  return useRemoveVault(vaultDelete);
}
