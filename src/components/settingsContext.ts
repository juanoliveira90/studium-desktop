import { createContext } from "react";

/** Opens the vault settings modal; wired up by the app shell. */
export const SettingsContext = createContext<() => void>(() => {});
