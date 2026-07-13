import { useState } from "react";

/**
 * The "+ new <thing>" row used at every level (plan, subject, task): a button
 * that swaps to a text input. Enter hands the trimmed name to onSubmit along
 * with a close callback (called on mutation success, so the row stays open on
 * failure); escape cancels without bubbling to page-level escape handlers.
 */
export function AddRow({
  label,
  placeholder,
  inputLabel,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  inputLabel: string;
  onSubmit: (name: string, close: () => void) => void;
}) {
  const [value, setValue] = useState<string | null>(null);

  if (value === null) {
    return (
      <button className="add-row" onClick={() => setValue("")}>
        {label}
      </button>
    );
  }

  const submit = () => {
    const name = value.trim();
    if (!name) return;
    onSubmit(name, () => setValue(null));
  };

  return (
    <input
      className="note-search add-row"
      type="text"
      placeholder={placeholder}
      aria-label={inputLabel}
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") {
          e.stopPropagation();
          setValue(null);
        }
      }}
    />
  );
}
