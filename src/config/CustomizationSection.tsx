import { BAR_POSITIONS, useUiSettings } from "./uiSettings";

/** Customization section of the config modal: bar position + icon labels. */
export function CustomizationSection() {
  const ui = useUiSettings();

  return (
    <>
      <p className="modal-title">customization</p>
      <fieldset className="config-field">
        <legend>bar position</legend>
        {BAR_POSITIONS.map((position) => (
          <label key={position} className="config-option">
            <input
              type="radio"
              name="bar-position"
              value={position}
              checked={ui.barPosition === position}
              onChange={() => ui.setBarPosition(position)}
            />
            {position}
          </label>
        ))}
      </fieldset>
      <label className="config-option">
        <input
          type="checkbox"
          checked={ui.showLabels}
          onChange={(e) => ui.setShowLabels(e.target.checked)}
        />
        show labels
      </label>
    </>
  );
}
