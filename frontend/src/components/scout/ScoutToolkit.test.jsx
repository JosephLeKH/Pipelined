import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import ScoutToolkit from "./ScoutToolkit";

const baseApp = {
  id: "a1",
  fit_score: null,
  apply_pack: null,
  resume_insights: null,
  thread_summary: null,
  interview_prep_briefing: null,
};

describe("ScoutToolkit", () => {
  it("renders all six tool cards", () => {
    render(<ScoutToolkit application={baseApp} onToolOpen={() => {}} />);
    expect(screen.getByText("Apply Pack")).toBeInTheDocument();
    expect(screen.getByText("Mock Interview")).toBeInTheDocument();
    expect(screen.getByText("Resume Insights")).toBeInTheDocument();
    expect(screen.getByText("Email Recap")).toBeInTheDocument();
    expect(screen.getByText("Interview Prep")).toBeInTheDocument();
    expect(screen.getByText("Follow-up Draft")).toBeInTheDocument();
  });

  it("shows Apply Pack as Ready when apply_pack is populated", () => {
    render(<ScoutToolkit application={{ ...baseApp, apply_pack: { cover_letter: "x" } }} onToolOpen={() => {}} />);
    expect(screen.getByRole("button", { name: /Apply Pack — Ready/i })).toBeInTheDocument();
  });

  it("shows Apply Pack as Run it when apply_pack is null", () => {
    render(<ScoutToolkit application={baseApp} onToolOpen={() => {}} />);
    expect(screen.getByRole("button", { name: /Apply Pack — Run it/i })).toBeInTheDocument();
  });

  it("calls onToolOpen with the tool key when a card is clicked", async () => {
    const onToolOpen = vi.fn();
    render(<ScoutToolkit application={baseApp} onToolOpen={onToolOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /Apply Pack/i }));
    expect(onToolOpen).toHaveBeenCalledWith("apply_pack");
  });
});
