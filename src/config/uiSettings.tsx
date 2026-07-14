import { createContext, useContext, useState } from "react";

/**
 * UI customization settings (config modal → customization section),
 * persisted in localStorage like the notes editor-mode toggle.
 */

export const BAR_POSITIONS = ["top", "bottom", "left", "right"] as const;
export type BarPosition = (typeof BAR_POSITIONS)[number];

export interface UiSettings {
  barPosition: BarPosition;
  setBarPosition: (position: BarPosition) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
}

const BAR_POSITION_KEY = "studium.ui.barPosition";
const SHOW_LABELS_KEY = "studium.ui.showLabels";

function loadBarPosition(): BarPosition {
  const stored = localStorage.getItem(BAR_POSITION_KEY);
  const isValid = (BAR_POSITIONS as readonly string[]).includes(stored ?? "");
  return isValid ? (stored as BarPosition) : "top";
}

function loadShowLabels(): boolean {
  return localStorage.getItem(SHOW_LABELS_KEY) !== "false";
}

/** Single state source for the UI settings; owned by the app shell. */
export function useUiSettingsState(): UiSettings {
  const [barPosition, setBarPositionState] = useState(loadBarPosition);
  const [showLabels, setShowLabelsState] = useState(loadShowLabels);

  const setBarPosition = (position: BarPosition) => {
    localStorage.setItem(BAR_POSITION_KEY, position);
    setBarPositionState(position);
  };

  const setShowLabels = (show: boolean) => {
    localStorage.setItem(SHOW_LABELS_KEY, String(show));
    setShowLabelsState(show);
  };

  return { barPosition, setBarPosition, showLabels, setShowLabels };
}

export const UiSettingsContext = createContext<UiSettings>({
  barPosition: "top",
  setBarPosition: () => {},
  showLabels: true,
  setShowLabels: () => {},
});

export function useUiSettings(): UiSettings {
  return useContext(UiSettingsContext);
}
