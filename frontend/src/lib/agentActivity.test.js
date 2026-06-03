/** Tests for agent activity helpers and dot colors. */

import { describe, it, expect } from "vitest";

import {
  AGENT_DOT_COLORS,
  AGENT_DOT_COLOR_DEFAULT,
  getAgentDotColor,
  groupAgentEntriesByDate,
  getAgentActivityHref,
} from "./agentActivity";

describe("getAgentDotColor", () => {
  it("should return Cardinal for autopilot", () => {
    expect(getAgentDotColor("autopilot")).toBe(AGENT_DOT_COLORS.autopilot);
    expect(AGENT_DOT_COLORS.autopilot).toBe("#8C1515");
  });

  it("should return amber for morning brief", () => {
    expect(getAgentDotColor("brief")).toBe("#F59E0B");
  });

  it("should return blue for gmail classify", () => {
    expect(getAgentDotColor("classify")).toBe("#3B82F6");
  });

  it("should return Palo Alto for weekly review", () => {
    expect(getAgentDotColor("review")).toBe("#175E54");
  });

  it("should return neutral for unknown agent types", () => {
    expect(getAgentDotColor("prep")).toBe(AGENT_DOT_COLOR_DEFAULT);
  });
});

describe("groupAgentEntriesByDate", () => {
  it("should group entries under Today label for same-day timestamps", () => {
    const now = new Date().toISOString();
    const groups = groupAgentEntriesByDate([
      { id: "1", created_at: now, summary: "Run A" },
      { id: "2", created_at: now, summary: "Run B" },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Today");
    expect(groups[0].entries).toHaveLength(2);
  });
});

describe("getAgentActivityHref", () => {
  it("should link to dashboard when application_id is present", () => {
    expect(getAgentActivityHref({ application_id: "abc123", agent_type: "fit" }))
      .toBe("/applications/abc123");
  });

  it("should link to pending inbox for autopilot without application", () => {
    expect(getAgentActivityHref({ agent_type: "autopilot" })).toBe("/inbox/pending");
  });

  it("should link to today for brief runs", () => {
    expect(getAgentActivityHref({ agent_type: "brief" })).toBe("/today");
  });
});
