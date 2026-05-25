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

const mockMutate = vi.fn();

const JOB_FIXTURE = {
  role: "Software Engineer",
  company: "Acme Corp",
  company_domain: "acme.com",
  location: "San Francisco, CA",
  remote_status: "hybrid",
  experience_level: "entry",
  salary_range: "$120k-$160k",
  apply_url: "https://acme.com/apply",
  description: "Build cool things.",
  is_stale: false,
  date_posted: "2026-04-01",
  score: 84,
};

describe("JobDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCreateApplication.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it("should render company and role in the header", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Software Engineer" })).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("should render location, remote, level, and salary as pills", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    expect(screen.getByText("San Francisco, CA")).toBeInTheDocument();
    expect(screen.getByText("Hybrid")).toBeInTheDocument();
    expect(screen.getByText("Entry")).toBeInTheDocument();
    expect(screen.getByText("$120k-$160k")).toBeInTheDocument();
  });

  it("should call onClose when X button is clicked", () => {
    const onClose = vi.fn();

    render(<JobDetailPanel job={JOB_FIXTURE} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();

    render(<JobDetailPanel job={JOB_FIXTURE} onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should render Open site button when apply_url is provided", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /open site/i })).toBeInTheDocument();
  });

  it("should not render Open site button when apply_url is absent", () => {
    const job = { ...JOB_FIXTURE, apply_url: null };

    render(<JobDetailPanel job={job} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /open site/i })).not.toBeInTheDocument();
  });

  it("should mark as Applied stage with board source on Mark applied click", () => {
    mockMutate.mockImplementation((_body, { onSuccess }) => onSuccess());

    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^mark applied$/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        role_title: "Software Engineer",
        company: "Acme Corp",
        current_stage: "Applied",
        source: "board",
        source_url: "https://acme.com/apply",
      }),
      expect.any(Object)
    );
    expect(toast.success).toHaveBeenCalledWith("Marked applied: Acme Corp · Software Engineer");
    expect(screen.getByRole("button", { name: /^applied$/i })).toBeDisabled();
  });

  it("should open the apply URL and mark applied when Open site is clicked", () => {
    mockMutate.mockImplementation((_body, { onSuccess }) => onSuccess());
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /open site/i }));

    expect(openSpy).toHaveBeenCalledWith("https://acme.com/apply", "_blank", "noopener,noreferrer");
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ current_stage: "Applied" }),
      expect.any(Object)
    );

    openSpy.mockRestore();
  });

  it("should render fit badge when score is present", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    expect(screen.getByTestId("fit-badge")).toBeInTheDocument();
    expect(screen.getByText("84%")).toBeInTheDocument();
  });

  it("should show description when present", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    expect(screen.getByText("Build cool things.")).toBeInTheDocument();
  });

  it("should show stale badge when job.is_stale is true", () => {
    const job = { ...JOB_FIXTURE, is_stale: true };

    render(<JobDetailPanel job={job} onClose={vi.fn()} />);

    expect(screen.getByText("May be expired")).toBeInTheDocument();
  });
});
