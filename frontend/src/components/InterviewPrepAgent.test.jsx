/** Tests for cached interview prep briefing on mount. */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { InterviewPrepAgent } from "./InterviewPrepAgent";

const CACHED_BRIEFING = {
  company: "Acme Corp",
  personalized: { salary_context: "Market rate is competitive." },
  compensation: { median_total_comp: "$180k" },
  interview_process: { difficulty: "Medium", rounds: [] },
  company_intel: { what_theyre_building: "Cloud infra." },
};

vi.mock("../hooks/useInterviewPrep", () => ({
  useInterviewPrep: vi.fn(),
}));

import { useInterviewPrep } from "../hooks/useInterviewPrep";

describe("InterviewPrepAgent", () => {
  it("should show cached briefing in done state without start research", () => {
    useInterviewPrep.mockReturnValue({
      status: "done",
      progressSteps: [],
      briefing: CACHED_BRIEFING,
      errorMessage: null,
      start: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
      STATUS: { IDLE: "idle", RUNNING: "running", DONE: "done", ERROR: "error" },
    });

    render(
      <InterviewPrepAgent
        applicationId="app1"
        briefing={CACHED_BRIEFING}
        generatedAt="2026-05-23T08:00:00Z"
      />
    );

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start research/i })).not.toBeInTheDocument();
    expect(screen.getByText("Market rate is competitive.")).toBeInTheDocument();
  });

  it("should show start research when no cached briefing", () => {
    useInterviewPrep.mockReturnValue({
      status: "idle",
      progressSteps: [],
      briefing: null,
      errorMessage: null,
      start: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
      STATUS: { IDLE: "idle", RUNNING: "running", DONE: "done", ERROR: "error" },
    });

    render(<InterviewPrepAgent applicationId="app1" briefing={null} generatedAt={null} />);

    expect(screen.getByRole("button", { name: /start research/i })).toBeInTheDocument();
  });
  it("should show researching shimmer when prep status is generating", () => {
    useInterviewPrep.mockReturnValue({
      status: "running",
      progressSteps: [],
      briefing: null,
      errorMessage: null,
      start: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
      STATUS: { IDLE: "idle", RUNNING: "running", DONE: "done", ERROR: "error" },
    });

    render(
      <InterviewPrepAgent
        applicationId="app1"
        briefing={null}
        generatedAt={null}
        prepStatus="generating"
      />
    );

    expect(screen.getByText("Researching…")).toBeInTheDocument();
  });

  it("should show retry when prep status is failed", () => {
    useInterviewPrep.mockReturnValue({
      status: "error",
      progressSteps: [],
      briefing: null,
      errorMessage: "Interview prep failed. Please try again.",
      start: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
      STATUS: { IDLE: "idle", RUNNING: "running", DONE: "done", ERROR: "error" },
    });

    render(
      <InterviewPrepAgent
        applicationId="app1"
        briefing={null}
        generatedAt={null}
        prepStatus="failed"
      />
    );

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

});
