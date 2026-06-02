/** Tests for useScoutSignal hook — memoized Scout signal resolver. */

import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useScoutSignal } from "./useScoutSignal";

describe("useScoutSignal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when no signals apply", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: new Date().toISOString(),
      fit_score: 60,
    };
    const { result } = renderHook(() => useScoutSignal(app, []));
    expect(result.current).toBeNull();
  });

  it("returns ghost signal when stale", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    };
    const { result } = renderHook(() => useScoutSignal(app, []));
    expect(result.current?.type).toBe("ghost");
  });
});
