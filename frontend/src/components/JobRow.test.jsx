/** Tests for JobRow — verifies dense list row layout and track action. */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../hooks/useApplications", () => ({
  useCreateApplication: vi.fn(),
}));

vi.mock("./CompanyLogo", () => ({
  default: () => <div data-testid="company-logo" />,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import JobRow from "./JobRow";
import { useCreateApplication } from "../hooks/useApplications";
import { toast } from "sonner";

const mockMutate = vi.fn();

const JOB = {
  id: "job2",
  company: "Beta Inc",
  role: "Frontend Engineer",
  location: "New York, NY",
  remote_status: "remote",
  experience_level: "senior",
  company_type: "enterprise",
  salary_range: "$140k–$180k",
  apply_url: "https://beta.example.com/apply",
  date_posted: "2026-03-10T00:00:00Z",
  is_stale: false,
  ingested_at: "2026-03-11T00:00:00Z",
};

describe("JobRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCreateApplication.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it("should render company and role in dense row layout", () => {
    render(<JobRow job={JOB} />);

    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    expect(screen.getByText("New York, NY")).toBeInTheDocument();
    expect(screen.getByText("Remote")).toBeInTheDocument();
    expect(screen.getByText("senior")).toBeInTheDocument();
  });

  it("should render 40 px tall row", () => {
    render(<JobRow job={JOB} />);

    expect(screen.getByRole("row")).toHaveClass("h-10");
  });

  it("should call onSelect when row is clicked", () => {
    const onSelect = vi.fn();

    render(<JobRow job={JOB} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("row"));

    expect(onSelect).toHaveBeenCalledWith(JOB);
  });

  it("should track job with To Apply stage and show toast", () => {
    mockMutate.mockImplementation((_body, opts) => opts.onSuccess?.());

    render(<JobRow job={JOB} />);
    fireEvent.click(screen.getByRole("button", { name: /track frontend engineer/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        role_title: "Frontend Engineer",
        company: "Beta Inc",
        current_stage: "To Apply",
        source: "board",
        source_url: "https://beta.example.com/apply",
      }),
      expect.any(Object)
    );
    expect(toast.success).toHaveBeenCalledWith("Tracking Beta Inc · Frontend Engineer");
  });

  it("should show stale badge when is_stale is true", () => {
    render(<JobRow job={{ ...JOB, is_stale: true }} />);

    expect(screen.getByTestId("stale-badge")).toBeInTheDocument();
  });

  it("should render fallback text when role and company are null", () => {
    render(<JobRow job={{ ...JOB, role: null, company: null }} />);

    expect(screen.getByText("Untitled Role")).toBeInTheDocument();
    expect(screen.getByText("Unknown Company")).toBeInTheDocument();
  });

  it("should apply provided style prop for virtualization", () => {
    const style = { position: "absolute", top: 0, height: 40 };

    render(<JobRow job={JOB} style={style} />);

    expect(screen.getByRole("row")).toHaveStyle({ position: "absolute" });
  });

  it("should highlight selected row", () => {
    render(<JobRow job={JOB} isSelected />);

    expect(screen.getByRole("row")).toHaveClass("bg-brand-50/40");
  });
});
