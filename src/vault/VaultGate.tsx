import { useState } from "react";
import { useOpenVault } from "./useVault";

/** Shown when no vault is remembered (or opening it failed): pick one by path. */
export function VaultGate({ loadError }: { loadError: Error | null }) {
  const [path, setPath] = useState("");
  const openVault = useOpenVault();

  const submit = (create: boolean) => {
    if (path.trim()) openVault.mutate({ path: path.trim(), create });
  };

  return (
    <div className="vault-gate">
      <p className="muted">no vault open — enter a directory to use as your vault</p>
      <input
        className="note-search"
        type="text"
        placeholder="/path/to/vault"
        aria-label="vault path"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit(false)}
      />
      <div className="vault-gate-actions">
        <button onClick={() => submit(false)}>open</button>
        <button onClick={() => submit(true)}>create</button>
      </div>
      {loadError && <p className="error">{String(loadError)}</p>}
      {openVault.isError && <p className="error">{String(openVault.error)}</p>}
    </div>
  );
}
