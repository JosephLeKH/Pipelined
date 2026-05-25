/** Unit tests for Today page greeting and date helpers. */

import { describe, it, expect, vi } from "vitest";

import {
  formatDaysLeftInWeek,
  formatTodayDateRow,
  formatTodayGreeting,
  getBriefExpandedForDate,
  getDaysLeftInWeek,
  getFirstName,
  getStoredCompletedMissions,
  getTimeOfDay,
  setBriefExpandedForDate,
  storeCompletedMission,
} from "./todayUtils";
import {
  COMPLETED_MISSIONS_BY_DATE_KEY,
  MORNING_BRIEF_EXPANDED_KEY,
} from "./constants";

describe("todayUtils", () => {
  it("should return morning before noon", () => {
    expect(getTimeOfDay(new Date("2026-05-23T09:00:00"))).toBe("morning");
  });

  it("should return afternoon between noon and 6pm", () => {
    expect(getTimeOfDay(new Date("2026-05-23T14:00:00"))).toBe("afternoon");
  });

  it("should return evening after 6pm", () => {
    expect(getTimeOfDay(new Date("2026-05-23T20:00:00"))).toBe("evening");
  });

  it("should extract first name from display name", () => {
    expect(getFirstName({ display_name: "Joseph Lee" })).toBe("Joseph");
  });

  it("should format greeting with time of day", () => {
    const greeting = formatTodayGreeting(
      { display_name: "Joseph" },
      new Date("2026-05-23T09:00:00"),
    );
    expect(greeting).toBe("Good morning, Joseph.");
  });

  it("should format date row with mission count", () => {
    const row = formatTodayDateRow("2026-05-23", 5, "America/Los_Angeles");
    expect(row).toMatch(/Saturday, May 23 · 5 missions/);
  });

  it("should count days left until Sunday in user timezone", () => {
    expect(getDaysLeftInWeek(new Date("2026-05-23T12:00:00"), "America/Los_Angeles")).toBe(1);
    expect(formatDaysLeftInWeek(new Date("2026-05-23T12:00:00"), "America/Los_Angeles")).toBe(
      "1 day left",
    );
  });

  it("should persist brief expanded state per date", () => {
    localStorage.removeItem(MORNING_BRIEF_EXPANDED_KEY);
    expect(getBriefExpandedForDate("2026-05-23")).toBe(false);
    setBriefExpandedForDate("2026-05-23", true);
    expect(getBriefExpandedForDate("2026-05-23")).toBe(true);
    expect(getBriefExpandedForDate("2026-05-24")).toBe(false);
  });

  it("should persist completed mission snapshots per brief date", () => {
    localStorage.removeItem(COMPLETED_MISSIONS_BY_DATE_KEY);
    const mission = {
      id: "follow_ups:0",
      title: "Acme — follow-up overdue",
      action_url: "/dashboard?selected=app1",
    };

    expect(getStoredCompletedMissions("2026-05-23")).toEqual([]);
    storeCompletedMission("2026-05-23", mission);
    expect(getStoredCompletedMissions("2026-05-23")).toEqual([
      { id: mission.id, title: mission.title, action_url: mission.action_url },
    ]);
    storeCompletedMission("2026-05-23", mission);
    expect(getStoredCompletedMissions("2026-05-23")).toHaveLength(1);
  });
});
