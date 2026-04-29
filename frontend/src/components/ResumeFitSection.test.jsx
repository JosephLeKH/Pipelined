import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ResumeFitSection from "./ResumeFitSection";

vi.mock("./FitBadge", () => ({
  default: ({ score }) => <span data-testid="fit-badge">{score}</span>,
}));

vi.mock("../lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const ANALYSIS_FIXTURE = {
  fit_score: 78,
  summary: "Strong alignment with the role requirements.",
  matched_skills: ["React", "TypeScript"],
  missing_skills: ["GraphQL"],
};

describe("ResumeFitSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when analysis is absent", () => {
    const { container } = render(<ResumeFitSection analysis={null} aiScoresRemainingToday={5} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should show quota exceeded message when aiScoresRemainingToday is 0 and no score", () => {
    render(<ResumeFitSection analysis={null} aiScoresRemainingToday={0} />);

    expect(screen.getByText(/daily limit reached/i)).toBeInTheDocument();
  });

  it("should render fit score when analysis has a score", () => {
    render(<ResumeFitSection analysis={ANALYSIS_FIXTURE} aiScoresRemainingToday={5} />);

    expect(screen.getByTestId("fit-badge")).toBeInTheDocument();
  });

  it("should render analysis summary when provided", () => {
    render(<ResumeFitSection analysis={ANALYSIS_FIXTURE} aiScoresRemainingToday={5} />);

    expect(screen.getByText("Strong alignment with the role requirements.")).toBeInTheDocument();
  });

  it("should render matched skills as badges", () => {
    render(<ResumeFitSection analysis={ANALYSIS_FIXTURE} aiScoresRemainingToday={5} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("should render missing skills as badges", () => {
    render(<ResumeFitSection analysis={ANALYSIS_FIXTURE} aiScoresRemainingToday={5} />);

    expect(screen.getByText("GraphQL")).toBeInTheDocument();
  });
});
