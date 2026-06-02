import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import ScoutTake from "./ScoutTake";

describe("ScoutTake", () => {
  it("renders skeleton with 'scoring' message when fit_score is null", () => {
    render(<ScoutTake application={{ id: "a1", fit_score: null }} onAskScout={() => {}} />);
    expect(screen.getByText(/Scout is scoring this/i)).toBeInTheDocument();
  });

  it("renders score + rationale when fit_score is present", () => {
    const app = {
      id: "a1",
      fit_score: 78,
      fit_score_summary: "Strong infra match, weak frontend signal.",
    };
    render(<ScoutTake application={app} onAskScout={() => {}} />);
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText(/Strong infra match/)).toBeInTheDocument();
  });

  it("calls onAskScout when 'Ask Scout' CTA is clicked", async () => {
    const onAskScout = vi.fn();
    render(
      <ScoutTake application={{ id: "a1", fit_score: 80 }} onAskScout={onAskScout} />
    );
    await userEvent.click(screen.getByRole("button", { name: /Ask Scout/i }));
    expect(onAskScout).toHaveBeenCalledOnce();
  });

  it("shows 'Upload resume' CTA when fit_score_status is 'no_resume'", () => {
    const app = { id: "a1", fit_score: null, fit_score_status: "no_resume" };
    render(<ScoutTake application={app} onAskScout={() => {}} />);
    expect(screen.getByText(/Upload resume/i)).toBeInTheDocument();
  });

  it("shows overdue follow-up as next step when applicable", () => {
    const app = {
      id: "a1",
      fit_score: 70,
      follow_up_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    };
    render(<ScoutTake application={app} onAskScout={() => {}} />);
    expect(screen.getByText(/send follow-up/i)).toBeInTheDocument();
  });
});
