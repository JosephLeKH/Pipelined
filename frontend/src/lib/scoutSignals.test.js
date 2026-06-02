import { describe, it, expect } from "vitest";

import { computeScoutSignal } from "./scoutSignals";

const TERMINAL_STAGES = new Set(["Rejected", "Withdrawn", "Offer", "Accepted"]);
const TODAY = new Date("2026-06-01T12:00:00Z");
function daysAgo(n) {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

describe("computeScoutSignal", () => {
  it("returns null when no signals apply", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(2),
      fit_score: 60,
      source: "manual",
    };
    expect(computeScoutSignal(app, [], { now: TODAY })).toBeNull();
  });

  it("returns 'reply' (priority 1) when follow_up_date is overdue", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(1),
      follow_up_date: daysAgo(3),
    };
    const sig = computeScoutSignal(app, [], { now: TODAY });
    expect(sig.type).toBe("reply");
    expect(sig.label).toMatch(/Reply needed/);
  });

  it("returns 'reply' when inbound email has no outbound reply >2d", () => {
    const app = { id: "a1", current_stage: "Interview", updated_at: daysAgo(1) };
    const events = [
      { direction: "inbound", occurred_at: daysAgo(4) },
    ];
    const sig = computeScoutSignal(app, events, { now: TODAY });
    expect(sig.type).toBe("reply");
  });

  it("does NOT return 'reply' when outbound reply exists after inbound", () => {
    const app = { id: "a1", current_stage: "Interview", updated_at: daysAgo(1) };
    const events = [
      { direction: "inbound", occurred_at: daysAgo(4) },
      { direction: "outbound", occurred_at: daysAgo(1) },
    ];
    expect(computeScoutSignal(app, events, { now: TODAY })).toBeNull();
  });

  it("returns 'ghost' when no movement >10 days and not terminal", () => {
    const app = { id: "a1", current_stage: "Applied", updated_at: daysAgo(12) };
    const sig = computeScoutSignal(app, [], { now: TODAY });
    expect(sig.type).toBe("ghost");
    expect(sig.label).toMatch(/Ghost risk/);
  });

  it("does NOT return 'ghost' when stage is terminal", () => {
    const app = { id: "a1", current_stage: "Rejected", updated_at: daysAgo(30) };
    expect(computeScoutSignal(app, [], { now: TODAY })).toBeNull();
  });

  it("returns 'found' when source is autopilot and unviewed", () => {
    const app = {
      id: "a1",
      current_stage: "To Apply",
      updated_at: daysAgo(1),
      source: "autopilot",
      viewed_at: null,
    };
    const sig = computeScoutSignal(app, [], { now: TODAY });
    expect(sig.type).toBe("found");
  });

  it("returns 'high_fit' when fit_score >= 85 and unviewed", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(1),
      fit_score: 88,
      viewed_at: null,
    };
    const sig = computeScoutSignal(app, [], { now: TODAY });
    expect(sig.type).toBe("high_fit");
    expect(sig.label).toMatch(/High fit/);
  });

  it("returns 'tools_ready' when apply_pack present and not viewed", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(1),
      apply_pack: { cover_letter: "..." },
      viewed_at: null,
    };
    const sig = computeScoutSignal(app, [], { now: TODAY });
    expect(sig.type).toBe("tools_ready");
  });

  it("priority: reply beats ghost", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(15),
      follow_up_date: daysAgo(2),
    };
    expect(computeScoutSignal(app, [], { now: TODAY }).type).toBe("reply");
  });

  it("priority: ghost beats found", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(15),
      source: "autopilot",
      viewed_at: null,
    };
    expect(computeScoutSignal(app, [], { now: TODAY }).type).toBe("ghost");
  });

  it("priority: found beats high_fit", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(1),
      source: "autopilot",
      fit_score: 90,
      viewed_at: null,
    };
    expect(computeScoutSignal(app, [], { now: TODAY }).type).toBe("found");
  });

  it("priority: high_fit beats tools_ready", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(1),
      fit_score: 90,
      apply_pack: { cover_letter: "..." },
      viewed_at: null,
    };
    expect(computeScoutSignal(app, [], { now: TODAY }).type).toBe("high_fit");
  });
});
