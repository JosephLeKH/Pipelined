/** Appearance preferences — density, font size, and accent; persisted in localStorage. */

export const DENSITY_KEY = "pipelined_density";
export const FONT_SIZE_KEY = "pipelined_font_size";
export const ACCENT_KEY = "pipelined_accent";

export const DENSITIES = ["compact", "comfortable"];
export const DEFAULT_DENSITY = "compact";

/* Font-size steps in px applied to <html> as an inline style. The middle
   step is the default and matches the browser default (16px). Inline style
   here overrides any `html { font-size }` rule in CSS — keep that in mind
   when adjusting global scale. */
export const FONT_SIZE_STEPS = [12, 14, 16, 18, 20];
export const DEFAULT_FONT_SIZE_INDEX = 2; // 16px = browser default

export const ACCENTS = ["cardinal", "default"];
export const DEFAULT_ACCENT = "cardinal";

function readStored(key, allowed, fallback) {
  const stored = localStorage.getItem(key);
  return allowed.includes(stored) ? stored : fallback;
}

export function readDensity() {
  return readStored(DENSITY_KEY, DENSITIES, DEFAULT_DENSITY);
}

export function readFontSizeIndex() {
  const raw = localStorage.getItem(FONT_SIZE_KEY);
  /* localStorage returns null when the key is unset; Number(null) === 0 which
     is a *valid* index, so without this guard new users silently get the
     smallest font size (the old bug shipping 12px to every fresh browser). */
  if (raw === null || raw === "") return DEFAULT_FONT_SIZE_INDEX;
  const index = Number(raw);
  if (Number.isInteger(index) && index >= 0 && index < FONT_SIZE_STEPS.length) {
    return index;
  }
  return DEFAULT_FONT_SIZE_INDEX;
}

export function readAccent() {
  return readStored(ACCENT_KEY, ACCENTS, DEFAULT_ACCENT);
}

export function applyDensity(density) {
  document.documentElement.dataset.density = density;
}

export function applyFontSizeIndex(index) {
  const safeIndex =
    Number.isInteger(index) && index >= 0 && index < FONT_SIZE_STEPS.length
      ? index
      : DEFAULT_FONT_SIZE_INDEX;
  document.documentElement.dataset.fontSizeStep = String(safeIndex);
  document.documentElement.style.fontSize = `${FONT_SIZE_STEPS[safeIndex]}px`;
}

export function applyAccent(accent) {
  document.documentElement.dataset.accent = accent;
}

export function applyAppearancePrefs(prefs = {}) {
  applyDensity(prefs.density ?? readDensity());
  applyFontSizeIndex(prefs.fontSizeIndex ?? readFontSizeIndex());
  applyAccent(prefs.accent ?? readAccent());
}

export function persistDensity(density) {
  localStorage.setItem(DENSITY_KEY, density);
  applyDensity(density);
}

export function persistFontSizeIndex(index) {
  localStorage.setItem(FONT_SIZE_KEY, String(index));
  applyFontSizeIndex(index);
}

export function persistAccent(accent) {
  localStorage.setItem(ACCENT_KEY, accent);
  applyAccent(accent);
}

export function initAppearancePrefs() {
  applyAppearancePrefs();
}
