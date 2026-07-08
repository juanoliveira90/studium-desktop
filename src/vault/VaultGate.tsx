import { pickFolder } from "./ipc";
import { useOpenVault } from "./useVault";

/** Shown when no vault is remembered (or opening it failed): pick one. */
export function VaultGate({ loadError }: { loadError: Error | null }) {
  const openVault = useOpenVault();

  const pick = async (create: boolean) => {
    const path = await pickFolder();
    if (path) openVault.mutate({ path, create });
  };

  return (
    <div className="vault-gate">
      <p className="muted">no vault open — choose a directory to use as your vault</p>
      <div className="vault-gate-actions">
        <button onClick={() => pick(false)}>open vault…</button>
        <button onClick={() => pick(true)}>create vault…</button>
      </div>
      {loadError && <p className="error">{String(loadError)}</p>}
      {openVault.isError && <p className="error">{String(openVault.error)}</p>}
    </div>
  );
}
