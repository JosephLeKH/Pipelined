/** Per-stage color overrides — persisted in localStorage (names → picker key). */

import {
  DEFAULT_STAGE_COLOR,
  STAGE_COLOR_PICKER_OPTIONS,
  STAGE_COLORS,
} from "./constants";

export const STAGE_COLOR_OVERRIDES_KEY = "pipelined_stage_color_overrides";

export function readStageColorOverrides() {
  try {
    const raw = localStorage.getItem(STAGE_COLOR_OVERRIDES_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function persistStageColorOverrides(overrides) {
  localStorage.setItem(STAGE_COLOR_OVERRIDES_KEY, JSON.stringify(overrides));
}

function hexForPickerKey(key) {
  return STAGE_COLOR_PICKER_OPTIONS.find((option) => option.key === key)?.hex ?? null;
}

export function resolveStageDotColor(stageName, overrides = readStageColorOverrides()) {
  const overrideHex = hexForPickerKey(overrides[stageName]);
  if (overrideHex) {
    return overrideHex;
  }
  return STAGE_COLORS[stageName]?.dotColor ?? DEFAULT_STAGE_COLOR.dotColor;
}

export function resolveStagePickerKey(stageName, overrides = readStageColorOverrides()) {
  if (overrides[stageName]) {
    return overrides[stageName];
  }
  const knownHex = STAGE_COLORS[stageName]?.dotColor;
  if (knownHex) {
    const match = STAGE_COLOR_PICKER_OPTIONS.find((option) => option.hex === knownHex);
    if (match) {
      return match.key;
    }
  }
  return "neutral";
}
