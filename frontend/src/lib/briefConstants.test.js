/** Tests for briefConstants helpers. */

import { describe, it, expect } from "vitest";

import { formatBriefHour, getBriefEmptyMessage, parseBriefItemScore } from "./briefConstants";

describe("briefConstants", () => {
  it("should format morning hours for display", () => {
    expect(formatBriefHour(0)).toBe("12am");
    expect(formatBriefHour(8)).toBe("8am");
    expect(formatBriefHour(12)).toBe("12pm");
    expect(formatBriefHour(14)).toBe("2pm");
  });

  it("should build empty message from configured hour", () => {
    expect(getBriefEmptyMessage(10)).toBe("Your brief generates at 10am — check back soon");
  });

  it("should parse match and fit scores from brief item body", () => {
    expect(parseBriefItemScore("Match score 91")).toBe(91);
    expect(parseBriefItemScore("Fit score 82")).toBe(82);
    expect(parseBriefItemScore("Draft ready")).toBeNull();
  });
});
