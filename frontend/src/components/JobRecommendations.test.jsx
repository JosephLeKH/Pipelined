import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobRecommendations } from "./JobRecommendations";

vi.mock("../hooks/useJobs", () => ({
  useRecommendedJobs: vi.fn(),
}));

vi.mock("../context/AuthContext", async () => {
  const { createContext } = await import("react");
  return { AuthContext: createContext({ user: { id: "u1", email: "test@example.com" } }) };
});

vi.mock("./JobCard", () => ({
  default: ({ job }) => <div data-testid="job-card">{job.role ?? job.title}</div>,
}));

import { useRecommendedJobs } from "../hooks/useJobs";

const MOCK_JOB = {
  id: "j1",
  role: "Senior Engineer",
  company: "Acme",
  score: 78,
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
    useRecommendedJobs.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() });

    renderComponent();

    expect(screen.getByText("Recommended for You")).toBeInTheDocument();
    expect(screen.getByText("Ranked by your resume keywords")).toBeInTheDocument();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should show error message with retry when recommendations endpoint fails", async () => {
    const refetch = vi.fn();
    useRecommendedJobs.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });

    renderComponent();

    expect(screen.getByText(/could not load recommendations/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("should show empty state when no recommendations are returned", () => {
    useRecommendedJobs.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() });

    const { container } = renderComponent();

    expect(container).toBeEmptyDOMElement();
  });

  it("should render recommendation cards with reason tag and score badge", () => {
    useRecommendedJobs.mockReturnValue({
      data: [MOCK_JOB],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderComponent();

    expect(screen.getByText("Recommended for You")).toBeInTheDocument();
    expect(screen.getByTestId("job-card")).toBeInTheDocument();
    expect(screen.getByText("Matches your skills")).toBeInTheDocument();
    expect(screen.getByTestId("fit-badge")).toHaveTextContent("78%");
  });
});
