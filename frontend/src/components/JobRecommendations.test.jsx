import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobRecommendations } from "./JobRecommendations";

vi.mock("../hooks/useJobs", () => ({
  useRecommendedJobs: vi.fn(),
}));

vi.mock("../hooks/useApplications", () => ({
  useCreateApplication: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("../context/AuthContext", async () => {
  const { createContext } = await import("react");
  return { AuthContext: createContext({ user: { id: "u1", email: "test@example.com" } }) };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useRecommendedJobs } from "../hooks/useJobs";

const MOCK_JOB = {
  id: "j1",
  role: "Senior Engineer",
  company: "Acme",
  location: "SF",
  remote_status: "remote",
  experience_level: "intern",
  score: 78,
  apply_url: "https://acme.example.com",
};

function makeJobs(count) {
  return Array.from({ length: count }, (_, i) => ({
    ...MOCK_JOB,
    id: `j${i + 1}`,
    role: `Role ${i + 1}`,
  }));
}

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

    expect(screen.getByText("Recommended for you")).toBeInTheDocument();
    expect(screen.getByText("based on your resume")).toBeInTheDocument();
    expect(screen.getAllByTestId("recommendation-skeleton")).toHaveLength(3);
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

  it("should render up to three recommendation tiles with fit score", () => {
    useRecommendedJobs.mockReturnValue({
      data: makeJobs(5),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderComponent();

    expect(screen.getByText("Recommended for you")).toBeInTheDocument();
    expect(screen.getAllByTestId("job-card")).toHaveLength(3);
    expect(screen.getAllByTestId("fit-badge")[0]).toHaveTextContent("78%");
  });

  it("should render fewer than three tiles when results are limited", () => {
    useRecommendedJobs.mockReturnValue({
      data: makeJobs(2),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderComponent();

    expect(screen.getAllByTestId("job-card")).toHaveLength(2);
  });
});
