import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  meetsWcagAaBody,
  WCAG_AA_BODY_RATIO,
} from "./wcagContrast";

/** PRD-00 Section 3 token pairs — light theme */
const LIGHT_BODY_PAIRS = [
  { fg: "#2E2D29", bg: "#FFFFFF", label: "light text-1 on surface-0" },
  { fg: "#53565A", bg: "#FFFFFF", label: "light text-2 on surface-0" },
];

/** PRD-00 Section 3 token pairs — dark theme (body text only) */
const DARK_BODY_PAIRS = [
  { fg: "#F4F4F5", bg: "#08090A", label: "dark text-1 on surface-0" },
  { fg: "#A1A1AA", bg: "#08090A", label: "dark text-2 on surface-0" },
];

describe("wcagContrast", () => {
  it("should report Cardinal Red on white above AAA body threshold", () => {
    expect(contrastRatio("#8C1515", "#FFFFFF")).toBeGreaterThan(7);
  });

  it("should not use Cardinal as dark-mode body text on surface-0", () => {
    expect(meetsWcagAaBody("#8C1515", "#08090A")).toBe(false);
  });

  it.each([...LIGHT_BODY_PAIRS, ...DARK_BODY_PAIRS])(
    "should meet WCAG AA body contrast for $label",
    ({ fg, bg }) => {
      expect(meetsWcagAaBody(fg, bg)).toBe(true);
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(WCAG_AA_BODY_RATIO);
    }
  );
});
