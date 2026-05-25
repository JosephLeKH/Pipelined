/** WCAG 2.1 contrast helpers for design-token verification (PRD-00). */

export const WCAG_AA_BODY_RATIO = 4.5;

const HEX_PATTERN = /^#?([0-9a-f]{6})$/i;

function channelFromHexPair(pair) {
  return parseInt(pair, 16) / 255;
}

function linearizeChannel(channel) {
  if (channel <= 0.03928) {
    return channel / 12.92;
  }
  return ((channel + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance for sRGB hex colors (#RRGGBB). */
export function relativeLuminance(hex) {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const raw = match[1];
  const r = linearizeChannel(channelFromHexPair(raw.slice(0, 2)));
  const g = linearizeChannel(channelFromHexPair(raw.slice(2, 4)));
  const b = linearizeChannel(channelFromHexPair(raw.slice(4, 6)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two hex foreground/background colors. */
export function contrastRatio(foregroundHex, backgroundHex) {
  const fg = relativeLuminance(foregroundHex);
  const bg = relativeLuminance(backgroundHex);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWcagAaBody(foregroundHex, backgroundHex) {
  return contrastRatio(foregroundHex, backgroundHex) >= WCAG_AA_BODY_RATIO;
}
