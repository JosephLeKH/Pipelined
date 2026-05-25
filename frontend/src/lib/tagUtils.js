/** Tag color helpers — 6 swatch presets with optional local overrides. */

import { TAG_COLOR_SWATCHES, TAG_COLORS_STORAGE_KEY } from "./constants";

function hashTagName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function defaultTagColor(tagName) {
  return TAG_COLOR_SWATCHES[hashTagName(tagName) % TAG_COLOR_SWATCHES.length];
}

export function loadTagColorOverrides() {
  try {
    const raw = localStorage.getItem(TAG_COLORS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveTagColor(tagName, color) {
  if (!TAG_COLOR_SWATCHES.includes(color)) return;
  const overrides = loadTagColorOverrides();
  overrides[tagName] = color;
  localStorage.setItem(TAG_COLORS_STORAGE_KEY, JSON.stringify(overrides));
}

export function getTagColor(tagName, overrides = loadTagColorOverrides()) {
  const override = overrides[tagName];
  if (override && TAG_COLOR_SWATCHES.includes(override)) return override;
  return defaultTagColor(tagName);
}
