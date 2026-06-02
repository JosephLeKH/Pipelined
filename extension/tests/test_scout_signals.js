/** Unit tests for the Scout signal resolver. Pure function — no DOM, no chrome. */

import { describe, it, expect } from "@jest/globals";

import { computeScoutSignal } from "../shared/scoutSignals.js";

const now = new Date("2026-06-02T12:00:00Z");

describe("computeScoutSignal", () => {
  it("returns null for fresh app with no signals", () => {
    expect(computeScoutSignal({ stage: "Applied", updated_at: now.toISOString() }, { now })).toBeNull();
  });

  it("returns high_fit when fit_score >= 85 and unviewed", () => {
    const s = computeScoutSignal(
      { stage: "Applied", updated_at: now.toISOString(), fit_score: 92, viewed_at: null },
      { now },
    );
    expect(s).toEqual({ type: "high_fit", label: "High fit (92)" });
  });

  it("suppresses high_fit once viewed_at is set", () => {
    const s = computeScoutSignal(
      { stage: "Applied", updated_at: now.toISOString(), fit_score: 92, viewed_at: now.toISOString() },
      { now },
    );
    expect(s).toBeNull();
  });

  it("returns ghost after 11 days with no update", () => {
    const updated = new Date(now.getTime() - 11 * 86400000);
    const s = computeScoutSignal(
      { stage: "Applied", updated_at: updated.toISOString() },
      { now },
    );
    expect(s).toEqual({ type: "ghost", label: "Ghost risk (11d)" });
  });

  it("skips ghost on terminal stages", () => {
    const updated = new Date(now.getTime() - 30 * 86400000);
    const s = computeScoutSignal(
      { stage: "Rejected", updated_at: updated.toISOString() },
      { now },
    );
    expect(s).toBeNull();
  });

  it("returns tools_ready when apply_pack_ready and unviewed", () => {
    const s = computeScoutSignal(
      { stage: "Applied", updated_at: now.toISOString(), apply_pack_ready: true, viewed_at: null },
      { now },
    );
    expect(s).toEqual({ type: "tools_ready", label: "Tools ready" });
  });

  it("returns tools_ready when interview_prep_ready and unviewed", () => {
    const s = computeScoutSignal(
      { stage: "Phone Screen", updated_at: now.toISOString(), interview_prep_ready: true, viewed_at: null },
      { now },
    );
    expect(s).toEqual({ type: "tools_ready", label: "Tools ready" });
  });

  it("prioritizes ghost over high_fit", () => {
    const updated = new Date(now.getTime() - 15 * 86400000);
    const s = computeScoutSignal(
      { stage: "Applied", updated_at: updated.toISOString(), fit_score: 95, viewed_at: null },
      { now },
    );
    expect(s.type).toBe("ghost");
  });
});
