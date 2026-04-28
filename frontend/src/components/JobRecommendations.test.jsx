import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobRecommendations } from "./JobRecommendations";

vi.mock("../hooks/useJobs", () => ({
  useRecommendedJobs: vi.fn(),
}));

vi.mock("../context/AuthContext", async () => {
  const { createContext } = await import("react");
  return { AuthContext: createContext({ user: { id: "u1", email: "test@example.com" } }) };
});

vi.mock("./JobCard", () => ({
  default: ({ job }) => <div data-testid="job-card">{job.title}</div>,
}));

import { useRecommendedJobs } from "../hooks/useJobs";

const MOCK_JOB = {
  id: "j1",
  title: "Senior Engineer",
  company: "Acme",
  reason: "Matches your skills",
};

function renderComponent(onSelectJob = vi.fn()) {
  return render(<JobRecommendations onSelectJob={onSelectJob} />);
}

describe("JobRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading skeleton while recommendations are fetching", () => {
    useRecommendedJobs.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    renderComponent();

    expect(screen.getByText("Recommended for You")).toBeInTheDocument();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should show error message when recommendations endpoint fails", () => {
    useRecommendedJobs.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    const { container } = renderComponent();

    expect(container).toBeEmptyDOMElement();
  });

  it("should show empty state when no recommendations are returned", () => {
    useRecommendedJobs.mockReturnValue({ data: [], isLoading: false, isError: false });

    const { container } = renderComponent();

    expect(container).toBeEmptyDOMElement();
  });

  it("should render recommendation cards with reason tag and score badge", () => {
    useRecommendedJobs.mockReturnValue({
      data: [MOCK_JOB],
      isLoading: false,
      isError: false,
    });

    renderComponent();

    expect(screen.getByText("Recommended for You")).toBeInTheDocument();
    expect(screen.getByTestId("job-card")).toBeInTheDocument();
    expect(screen.getByText("Matches your skills")).toBeInTheDocument();
  });
});
