import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  TAG_COLOR_SWATCHES,
  TAG_COLORS_STORAGE_KEY,
} from "./constants";
import {
  defaultTagColor,
  getTagColor,
  loadTagColorOverrides,
  saveTagColor,
} from "./tagUtils";

describe("tagUtils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should assign colors from the 6 swatch presets only", () => {
    expect(TAG_COLOR_SWATCHES).toHaveLength(6);
    expect(defaultTagColor("frontend")).toBeTruthy();
    expect(TAG_COLOR_SWATCHES).toContain(defaultTagColor("frontend"));
  });

  it("should persist color overrides in localStorage", () => {
    saveTagColor("frontend", TAG_COLOR_SWATCHES[1]);
    const overrides = loadTagColorOverrides();
    expect(overrides.frontend).toBe(TAG_COLOR_SWATCHES[1]);
    expect(getTagColor("frontend")).toBe(TAG_COLOR_SWATCHES[1]);
  });

  it("should reject colors outside the swatch palette", () => {
    saveTagColor("frontend", "#FF00FF");
    expect(getTagColor("frontend")).toBe(defaultTagColor("frontend"));
    expect(localStorage.getItem(TAG_COLORS_STORAGE_KEY)).toBeNull();
  });
});
