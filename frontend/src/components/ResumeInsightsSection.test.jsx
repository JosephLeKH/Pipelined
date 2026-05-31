/** Tests for ResumeInsightsSection — job match analysis, generate, and display. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";

import ResumeInsightsSection from "./ResumeInsightsSection";

vi.mock("../api/applications", () => ({
  generateResumeInsights: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { generateResumeInsights } from "../api/applications";

const MOCK_INSIGHTS = {
  overall_summary: "Good alignment with the role.",
  keyword_gaps: ["Docker", "Kubernetes"],
  section_suggestions: ["Add quantified impact metrics"],
  bullet_rewrites: [
    {
      original: "Built a system",
      suggested: "Architected a distributed system serving 1M+ users",
    },
  ],
};

describe("ResumeInsightsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display 'Job Match Analysis' as title (not 'Resume Insights')", () => {
    render(
      <ResumeInsightsSection
        application={{
          id: "app1",
          job_description: "",
          resume_insights: null,
        }}
        onUpdate={vi.fn()}
        onInsightsGenerated={vi.fn()}
      />
    );

    expect(screen.getByText("Job Match Analysis")).toBeInTheDocument();
    expect(screen.queryByText("Resume Insights")).not.toBeInTheDocument();
  });

  it("should show source attribution line", () => {
    render(
      <ResumeInsightsSection
        application={{
          id: "app1",
          job_description: "",
          resume_insights: null,
        }}
        onUpdate={vi.fn()}
        onInsightsGenerated={vi.fn()}
      />
    );

    expect(screen.getByText(/based on your resume vs\. this job description/i)).toBeInTheDocument();
  });

  it("should generate insights and display results", async () => {
    generateResumeInsights.mockResolvedValue(MOCK_INSIGHTS);
    const onInsightsGenerated = vi.fn();

    render(
      <ResumeInsightsSection
        application={{
          id: "app1",
          job_description: "Python engineer role",
          resume_insights: null,
        }}
        onUpdate={vi.fn()}
        onInsightsGenerated={onInsightsGenerated}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /analyze resume/i }));

    await waitFor(() => {
      expect(screen.getByText("Good alignment with the role.")).toBeInTheDocument();
    });

    expect(screen.getByText("Docker")).toBeInTheDocument();
    expect(screen.getByText("Add quantified impact metrics")).toBeInTheDocument();
    expect(onInsightsGenerated).toHaveBeenCalledWith(MOCK_INSIGHTS);
  });

  it("should render cached insights without generating", () => {
    render(
      <ResumeInsightsSection
        application={{
          id: "app1",
          job_description: "Role",
          resume_insights: MOCK_INSIGHTS,
        }}
        onUpdate={vi.fn()}
        onInsightsGenerated={vi.fn()}
      />
    );

    expect(screen.getByText("Good alignment with the role.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh insights/i })).toBeInTheDocument();
  });
});
