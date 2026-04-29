import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JobBoardContent } from "./JobBoardContent";

vi.mock("./JobCard", () => ({
  default: ({ job }) => <div data-testid="job-card">{job.id}</div>,
}));

vi.mock("../components/ApiErrorMessage", () => ({
  default: ({ error }) => <div role="alert">{error.message}</div>,
}));

const JOBS_FIXTURE = [
  { id: "j1", role: "Engineer", company: "Acme" },
  { id: "j2", role: "Analyst", company: "Beta Inc" },
];

const DEFAULT_PROPS = {
  isLoading: false,
  error: null,
  jobs: JOBS_FIXTURE,
  total: 2,
  hasFilters: false,
  hasMore: false,
  onClearFilters: vi.fn(),
  onLoadMore: vi.fn(),
  onSelectJob: vi.fn(),
  refetch: vi.fn(),
};

describe("JobBoardContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading skeleton when isLoading is true", () => {
    render(<JobBoardContent {...DEFAULT_PROPS} isLoading={true} jobs={[]} />);

    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("should show error message when error is set", () => {
    render(<JobBoardContent {...DEFAULT_PROPS} jobs={[]} error={new Error("Network error")} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Network error");
  });

  it("should show empty state when jobs array is empty", () => {
    render(<JobBoardContent {...DEFAULT_PROPS} jobs={[]} total={0} />);

    expect(screen.getByText(/no listings match/i)).toBeInTheDocument();
  });

  it("should show Clear filters button in empty state when hasFilters is true", () => {
    const onClear = vi.fn();

    render(<JobBoardContent {...DEFAULT_PROPS} jobs={[]} total={0} hasFilters={true} onClearFilters={onClear} />);
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(onClear).toHaveBeenCalledOnce();
  });

  it("should render a JobCard for each job", () => {
    render(<JobBoardContent {...DEFAULT_PROPS} />);

    expect(screen.getAllByTestId("job-card")).toHaveLength(2);
  });

  it("should show Load more button when hasMore is true", () => {
    render(<JobBoardContent {...DEFAULT_PROPS} hasMore={true} />);

    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("should call onLoadMore when Load more is clicked", () => {
    const onLoadMore = vi.fn();

    render(<JobBoardContent {...DEFAULT_PROPS} hasMore={true} onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));

    expect(onLoadMore).toHaveBeenCalledOnce();
  });
});
