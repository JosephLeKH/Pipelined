import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

  it("should render fit score when ai_analysis has a score", () => {
    renderSection({
      application: { ...APPLICATION, ai_analysis: ANALYSIS_FIXTURE },
      hasResume: true,
      aiScoresRemainingToday: 5,
      onScoreGenerated: vi.fn(),
    });

    expect(screen.getByTestId("fit-badge")).toHaveTextContent("78");
    expect(screen.getByText("Strong alignment with the role requirements.")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("GraphQL")).toBeInTheDocument();
  });

  it("should show analyze fit CTA when resume exists but no score", () => {
    renderSection({
      application: { ...APPLICATION, date_applied: "2020-01-01T00:00:00Z" },
      hasResume: true,
      aiScoresRemainingToday: 5,
      onScoreGenerated: vi.fn(),
    });

    expect(screen.getByRole("button", { name: /analyze fit/i })).toBeInTheDocument();
  });
});
