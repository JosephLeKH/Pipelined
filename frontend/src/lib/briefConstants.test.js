/** Tests for briefConstants helpers. */

import { describe, it, expect } from "vitest";

import { formatBriefHour, getBriefEmptyMessage, parseBriefItemScore, parseDeadlineLabel } from "./briefConstants";

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

  it("should parse deadline labels from OA brief item body", () => {
    expect(parseDeadlineLabel("Due in 3 days")).toEqual({
      label: "Due in 3 days",
      tone: "soon",
    });
    expect(parseDeadlineLabel("Due in 1 day")).toEqual({
      label: "Due in 1 day",
      tone: "urgent",
    });
    expect(parseDeadlineLabel("Due today")).toEqual({
      label: "Due today",
      tone: "urgent",
    });
    expect(parseDeadlineLabel("Overdue by 2 days")).toEqual({
      label: "Overdue 2 days",
      tone: "overdue",
    });
  });
});
