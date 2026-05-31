import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AiFitSection from "./AiFitSection";

vi.mock("./FitBadge", () => ({
  default: ({ score }) => <span data-testid="fit-badge">{score}</span>,
}));

vi.mock("../lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("../api/applications", () => ({
  fetchApplication: vi.fn(),
  generateFitScore: vi.fn(),
}));

const APPLICATION = {
  id: "app1",
  date_applied: new Date().toISOString(),
  fit_score: null,
  fit_score_reason: null,
  ai_analysis: null,
  fit_score_status: null,
  fit_score_requested_at: null,
};

const ANALYSIS_FIXTURE = {
  fit_score: 78,
  summary: "Strong alignment with the role requirements.",
  matched_skills: ["React", "TypeScript"],
  missing_skills: ["GraphQL"],
};

describe("AiFitSection", () => {
  function renderSection(props) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <AiFitSection {...props} />
      </QueryClientProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when user has no resume and no score", () => {
    const { container } = renderSection({
      application: APPLICATION,
      hasResume: false,
      aiScoresRemainingToday: 5,
      onScoreGenerated: vi.fn(),
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("should show quota exceeded message when aiScoresRemainingToday is 0 and no score", () => {
    renderSection({
      application: APPLICATION,
      hasResume: true,
      aiScoresRemainingToday: 0,
      onScoreGenerated: vi.fn(),
    });

    expect(screen.getByText(/daily ai limit reached/i)).toBeInTheDocument();
  });

  it("should render fit score when ai_analysis has a score", async () => {
    renderSection({
      application: { ...APPLICATION, ai_analysis: ANALYSIS_FIXTURE },
      hasResume: true,
      aiScoresRemainingToday: 5,
      onScoreGenerated: vi.fn(),
    });

    expect(screen.getByTestId("fit-badge")).toHaveTextContent("78");
    expect(screen.queryByText("Strong alignment with the role requirements.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /why\?/i })).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("GraphQL")).toBeInTheDocument();
  });

  it("should auto-fire fit-score generation when resume exists but no score", async () => {
    const { generateFitScore } = await import("../api/applications");
    generateFitScore.mockResolvedValueOnce({ score: 71, reason: "auto" });

    renderSection({
      application: { ...APPLICATION, date_applied: "2020-01-01T00:00:00Z" },
      hasResume: true,
      aiScoresRemainingToday: 5,
      onScoreGenerated: vi.fn(),
    });

    expect(generateFitScore).toHaveBeenCalledWith("app1");
    expect(screen.queryByRole("button", { name: /^analyze fit$/i })).not.toBeInTheDocument();
  });

  it("should show source attribution line", () => {
    renderSection({
      application: { ...APPLICATION, date_applied: "2020-01-01T00:00:00Z" },
      hasResume: true,
      aiScoresRemainingToday: 5,
      onScoreGenerated: vi.fn(),
    });

    expect(screen.getByText(/based on your resume.*this job description/i)).toBeInTheDocument();
  });

  it("should show error message and Retry button when fit_score_status === error", async () => {
    const user = userEvent.setup();
    const onScoreGenerated = vi.fn();
    const { generateFitScore } = await import("../api/applications");

    renderSection({
      application: { ...APPLICATION, fit_score_status: "error" },
      hasResume: true,
      aiScoresRemainingToday: 5,
      onScoreGenerated,
    });

    expect(screen.getByText(/fit score calculation failed/i)).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /retry fit score/i });
    expect(retryButton).toBeInTheDocument();

    // Click retry
    await user.click(retryButton);

    expect(generateFitScore).toHaveBeenCalledWith("app1");
  });

  it("should show 'Taking longer than expected' message when pending > 60s", async () => {
    const now = Date.now();
    const sixtySecondsAgo = new Date(now - 61000).toISOString();

    renderSection({
      application: {
        ...APPLICATION,
        fit_score_status: "pending",
        fit_score_requested_at: sixtySecondsAgo,
      },
      hasResume: true,
      aiScoresRemainingToday: 5,
      onScoreGenerated: vi.fn(),
    });

    expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry fit score/i })).toBeInTheDocument();
  });

  it("should not show 'Taking longer than expected' when pending < 60s", () => {
    const now = Date.now();
    const thirtySecondsAgo = new Date(now - 30000).toISOString();

    renderSection({
      application: {
        ...APPLICATION,
        fit_score_status: "pending",
        fit_score_requested_at: thirtySecondsAgo,
      },
      hasResume: true,
      aiScoresRemainingToday: 5,
      onScoreGenerated: vi.fn(),
    });

    expect(screen.queryByText(/taking longer than expected/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Calculating fit score")).toBeInTheDocument(); // shimmer
  });
});
