import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDate, formatDateTime, formatTime, formatRelative, formatSavedAgo, toISODate } from "./dateUtils";

describe("formatDate", () => {
  it("should format an ISO datetime string as 'Mon D, YYYY'", () => {
    const result = formatDate("2026-04-07T10:00:00.000Z");

    expect(result).toMatch(/Apr\s+7,\s+2026/);
  });

  it("should format a date-only string without timezone shift", () => {
    const result = formatDate("2026-04-07");

    expect(result).toMatch(/Apr\s+7,\s+2026/);
  });

  it("should return empty string for falsy input", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });
});

describe("formatDateTime", () => {
  it("should include date and time separated by 'at'", () => {
    const result = formatDateTime("2026-04-07T15:00:00.000Z");

    expect(result).toContain("at");
    expect(result).toMatch(/Apr|March|2026/);
  });

  it("should format in the provided timezone", () => {
    // 2026-04-07T20:00:00Z = 1:00 PM PDT (UTC-7)
    const result = formatDateTime("2026-04-07T20:00:00.000Z", "America/Los_Angeles");

    expect(result).toContain("at");
    expect(result).toMatch(/Apr\s+7,\s+2026/);
    expect(result).toMatch(/1:00\s*PM/);
  });

  it("should return empty string for falsy input", () => {
    expect(formatDateTime("")).toBe("");
  });
});

describe("formatTime", () => {
  it("should format HH:MM as H:MM AM/PM", () => {
    expect(formatTime("09:30")).toBe("9:30 AM");
    expect(formatTime("13:00")).toBe("1:00 PM");
    expect(formatTime("00:00")).toBe("12:00 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
  });

  it("should handle HH:MM:SS format", () => {
    expect(formatTime("14:45:00")).toBe("2:45 PM");
  });

  it("should return empty string for falsy input", () => {
    expect(formatTime("")).toBe("");
    expect(formatTime(null)).toBe("");
    expect(formatTime(undefined)).toBe("");
  });
});

describe("formatRelative", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return 'Today' for today's date", () => {
    const result = formatRelative("2026-04-08");

    expect(result).toBe("Today");
  });

  it("should return 'Yesterday' for yesterday's date", () => {
    const result = formatRelative("2026-04-07");

    expect(result).toBe("Yesterday");
  });

  it("should return 'N days ago' for dates within the past 7 days", () => {
    const result = formatRelative("2026-04-05");

    expect(result).toBe("3 days ago");
  });

  it("should fall back to formatDate for dates older than 7 days", () => {
    const result = formatRelative("2026-03-01");

    expect(result).toMatch(/Mar\s+1,\s+2026/);
  });

  it("should return empty string for falsy input", () => {
    expect(formatRelative("")).toBe("");
  });
});

describe("formatSavedAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return 'just now' within 5 seconds", () => {
    const savedAt = new Date("2026-05-25T11:59:58.000Z");

    expect(formatSavedAgo(savedAt)).toBe("just now");
  });

  it("should return seconds ago for recent saves", () => {
    const savedAt = new Date("2026-05-25T11:59:50.000Z");

    expect(formatSavedAgo(savedAt)).toBe("10 s ago");
  });

  it("should return minutes ago for older saves", () => {
    const savedAt = new Date("2026-05-25T11:57:00.000Z");

    expect(formatSavedAgo(savedAt)).toBe("3 min ago");
  });

  it("should return empty string for falsy input", () => {
    expect(formatSavedAgo(null)).toBe("");
  });
});

describe("toISODate", () => {
  it("should convert a Date object to YYYY-MM-DD using local time", () => {
    const date = new Date(2026, 3, 7); // April 7, 2026 local time

    expect(toISODate(date)).toBe("2026-04-07");
  });
});
