/*
 * Shared display formatting for the vault's quoted ISO dates ("2026-07-01"),
 * used by the notes, plans and home pages.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

export function formatDateRange(start: string, end: string): string {
  return `${formatShortDate(start)} — ${formatShortDate(end)}`;
}
