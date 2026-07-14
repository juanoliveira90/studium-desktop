/*
 * Tiny hex color math for deriving the shades a 16-color palette doesn't
 * define (dim/faint text, accent tints, borders). Pure functions instead of
 * CSS color-mix() so they're trivially unit-testable and independent of the
 * webview's CSS support.
 */

/** #rgb / #rrggbb (leading # optional) → [r, g, b]. */
function parseHex(hex: string): [number, number, number] {
  const digits = hex.startsWith("#") ? hex.slice(1) : hex;
  const expanded =
    digits.length === 3
      ? digits
          .split("")
          .map((d) => d + d)
          .join("")
      : digits;
  const value = parseInt(expanded, 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function toHex(channels: number[]): string {
  const digits = channels
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("");
  return `#${digits}`;
}

/** Blend `hexA` over `hexB`: weightA=1 is pure A, 0 is pure B. */
export function mix(hexA: string, hexB: string, weightA: number): string {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  const blended = a.map((channel, i) => channel * weightA + b[i] * (1 - weightA));
  return toHex(blended);
}

/** A hex color as `rgb(r g b / alpha)`. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}
