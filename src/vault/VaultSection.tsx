import { useState } from "react";
import { pickFolder } from "./ipc";
import {
  useDeleteVault,
  useForgetVault,
  useKnownVaults,
  useOpenVault,
  useVault,
} from "./useVault";

/**
 * Vault section of the config modal: switch between known vaults, add new
 * ones via the native folder picker, and remove them — "forget" keeps the
 * files, "delete files" needs a second explicit click before touching the
 * disk. Switching or adding a vault closes the modal via `onClose`.
 */
export function VaultSection({ onClose }: { onClose: () => void }) {
  const vault = useVault();
  const known = useKnownVaults();
  const openVault = useOpenVault();
  const forgetVault = useForgetVault();
  const deleteVault = useDeleteVault();

  // Path with its confirm row showing, and whether "delete files" has been
  // clicked once already (the second click actually deletes).
  const [confirming, setConfirming] = useState<string | null>(null);
  const [armedForDisk, setArmedForDisk] = useState(false);

  const switchTo = (path: string) => {
    openVault.mutate({ path, create: false }, { onSuccess: onClose });
  };

  const addVault = async (create: boolean) => {
    const path = await pickFolder();
    if (path) openVault.mutate({ path, create }, { onSuccess: onClose });
  };

  const startRemove = (path: string) => {
    setConfirming(path);
    setArmedForDisk(false);
  };

  const error = openVault.error ?? forgetVault.error ?? deleteVault.error;

  return (
    <>
      <p className="modal-title">vaults</p>
      <ul className="vault-list">
        {(known.data ?? []).map((path) => {
          const isCurrent = path === vault.data;
          return (
            <li key={path} className="vault-row">
              <button
                className={`vault-path${isCurrent ? " is-active" : ""}`}
                aria-current={isCurrent || undefined}
                onClick={() => !isCurrent && switchTo(path)}
              >
                {path}
                {isCurrent && <span className="muted"> (open)</span>}
              </button>
              {confirming === path ? (
                <span className="vault-confirm">
                  <button onClick={() => forgetVault.mutate(path)}>forget</button>
                  {armedForDisk ? (
                    <button
                      className="danger"
                      onClick={() => deleteVault.mutate(path)}
                    >
                      really delete files?
                    </button>
                  ) : (
                    <button className="danger" onClick={() => setArmedForDisk(true)}>
                      delete files
                    </button>
                  )}
                  <button onClick={() => setConfirming(null)}>cancel</button>
                </span>
              ) : (
                <button
                  className="vault-remove"
                  aria-label={`remove ${path}`}
                  onClick={() => startRemove(path)}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="vault-gate-actions">
        <button onClick={() => addVault(true)}>+ new vault</button>
        <button onClick={() => addVault(false)}>open folder…</button>
      </div>
      {known.isError && <p className="error">{String(known.error)}</p>}
      {error && <p className="error">{String(error)}</p>}
    </>
  );
}
