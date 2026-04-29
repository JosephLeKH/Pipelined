import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ApplicationListEmpty } from "./ApplicationListEmpty";

vi.mock("./ApiErrorMessage", () => ({
  default: ({ error }) => <div role="alert">{error.message}</div>,
}));

vi.mock("./EmptyState", () => ({
  default: ({ title }) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock("./SkeletonRow", () => ({
  default: () => <div data-testid="skeleton-row" />,
}));

const BASE_PROPS = {
  isLoading: false,
  error: null,
  applications: [],
  filters: {},
  refetch: vi.fn(),
  onClearFilters: vi.fn(),
  onAdd: vi.fn(),
  onImportCsv: vi.fn(),
};

describe("ApplicationListEmpty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show skeleton rows while loading", () => {
    render(<ApplicationListEmpty {...BASE_PROPS} isLoading={true} />);

    expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThan(0);
  });

  it("should show error when error is set", () => {
    render(<ApplicationListEmpty {...BASE_PROPS} error={new Error("Network error")} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Network error");
  });

  it("should show filtered empty state with clear button when filters are active", () => {
    render(<ApplicationListEmpty {...BASE_PROPS} filters={{ stage: "Applied" }} />);

    expect(screen.getByText(/no applications match your filters/i)).toBeInTheDocument();
  });

  it("should call onClearFilters when clear button is clicked", () => {
    const onClearFilters = vi.fn();

    render(<ApplicationListEmpty {...BASE_PROPS} filters={{ stage: "Applied" }} onClearFilters={onClearFilters} />);
    fireEvent.click(screen.getByRole("button", { name: /clear all filters/i }));

    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it("should show empty state when no applications and no filters", () => {
    render(<ApplicationListEmpty {...BASE_PROPS} />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("should return null when applications exist", () => {
    const { container } = render(<ApplicationListEmpty {...BASE_PROPS} applications={[{ id: "a1" }]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
