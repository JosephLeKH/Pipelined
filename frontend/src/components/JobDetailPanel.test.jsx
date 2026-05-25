import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import JobDetailPanel from "./JobDetailPanel";

vi.mock("../hooks/useApplications", () => ({
  useCreateApplication: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useCreateApplication } from "../hooks/useApplications";
import { toast } from "sonner";
import { DETAIL_PANEL_WIDTH_PX, DRAWER_ANIMATION_MS } from "../lib/constants";

const mockMutate = vi.fn();

const JOB_FIXTURE = {
  role: "Software Engineer",
  company: "Acme Corp",
  company_domain: "acme.com",
  location: "San Francisco, CA",
  remote_status: "Hybrid",
  salary_range: "$120k–$160k",
  apply_url: "https://acme.com/apply",
  description: "Build cool things.",
  requirements: ["3+ years experience", "React skills"],
  is_stale: false,
  date_posted: "2026-04-01",
  score: 84,
};

describe("JobDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCreateApplication.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it("should render the company — role title in the header", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Acme Corp · Software Engineer" })).toBeInTheDocument();
  });

  it("should render the drawer at 520px width with slide transition", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    const panel = screen.getByTestId("job-detail-panel");
    expect(panel).toHaveStyle({ width: `${DETAIL_PANEL_WIDTH_PX}px` });
    expect(panel.style.transitionDuration).toBe(`${DRAWER_ANIMATION_MS}ms`);
    expect(panel).toHaveClass("motion-safe-drawer");
  });

  it("should call onClose when backdrop is clicked", () => {
    const onClose = vi.fn();

    render(<JobDetailPanel job={JOB_FIXTURE} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close detail panel/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onClose when the X close button is clicked", () => {
    const onClose = vi.fn();

    render(<JobDetailPanel job={JOB_FIXTURE} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should render Open job link when apply_url is provided", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    const link = screen.getByRole("link", { name: /open job/i });
    expect(link).toHaveAttribute("href", "https://acme.com/apply");
  });

  it("should not render Open job link when apply_url is absent", () => {
    const job = { ...JOB_FIXTURE, apply_url: null };

    render(<JobDetailPanel job={job} onClose={vi.fn()} />);

    expect(screen.queryByRole("link", { name: /open job/i })).not.toBeInTheDocument();
  });

  it("should show Tracking and toast after successful track", () => {
    mockMutate.mockImplementation((_body, { onSuccess }) => onSuccess());

    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^track$/i }));

    expect(screen.getByRole("button", { name: /^tracking$/i })).toBeDisabled();
    expect(toast.success).toHaveBeenCalledWith("Tracking Acme Corp · Software Engineer");
  });

  it("should create application at To Apply stage with board source", () => {
    mockMutate.mockImplementation((_body, { onSuccess }) => onSuccess());

    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^track$/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        role_title: "Software Engineer",
        company: "Acme Corp",
        current_stage: "To Apply",
        source: "board",
        source_url: "https://acme.com/apply",
      }),
      expect.any(Object)
    );
  });

  it("should render fit badge when score is present", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    expect(screen.getByTestId("fit-badge")).toBeInTheDocument();
    expect(screen.getByText("84%")).toBeInTheDocument();
  });

  it("should render About the role and Requirements sections", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    expect(screen.getByText("About the role")).toBeInTheDocument();
    expect(screen.getByText("Build cool things.")).toBeInTheDocument();
    expect(screen.getByText("Requirements")).toBeInTheDocument();
    expect(screen.getByText("3+ years experience")).toBeInTheDocument();
  });

  it("should show stale badge when job.is_stale is true", () => {
    const job = { ...JOB_FIXTURE, is_stale: true };

    render(<JobDetailPanel job={job} onClose={vi.fn()} />);

    expect(screen.getByText("May be expired")).toBeInTheDocument();
  });
});
