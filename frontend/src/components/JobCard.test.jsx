/** Tests for JobCard recommendation tile — fit score, meta line, and Track action. */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../hooks/useApplications", () => ({
  useCreateApplication: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import JobCard from "./JobCard";
import { useCreateApplication } from "../hooks/useApplications";
import { toast } from "sonner";

const mockMutate = vi.fn();

const JOB = {
  id: "job1",
  company: "Anthropic",
  role: "Forward Deployed Engineer",
  location: "San Francisco, CA",
  remote_status: "remote",
  experience_level: "intern",
  apply_url: "https://anthropic.example.com/apply",
  score: 84,
};

describe("JobCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCreateApplication.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it("should render company, role, and meta line", () => {
    render(<JobCard job={JOB} />);

    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    expect(screen.getByText("Forward Deployed Engineer")).toBeInTheDocument();
    expect(screen.getByText(/San Francisco, CA · Remote · intern/i)).toBeInTheDocument();
  });

  it("should render FitBadge with sparkle when score is 70 or above", () => {
    render(<JobCard job={JOB} />);

    expect(screen.getByTestId("fit-badge")).toHaveTextContent("84%");
  });

  it("should not render FitBadge when score is zero or missing", () => {
    render(<JobCard job={{ ...JOB, score: 0 }} />);

    expect(screen.queryByTestId("fit-badge")).not.toBeInTheDocument();
  });

  it("should use score prop over job.score when provided", () => {
    render(<JobCard job={{ ...JOB, score: 50 }} score={92} />);

    expect(screen.getByTestId("fit-badge")).toHaveTextContent("92%");
  });

  it("should be 160 px tall", () => {
    render(<JobCard job={JOB} />);

    expect(screen.getByTestId("job-card")).toHaveClass("h-40");
  });

  it("should call onSelect when tile is clicked", () => {
    const onSelect = vi.fn();
    render(<JobCard job={JOB} onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId("job-card"));

    expect(onSelect).toHaveBeenCalledWith(JOB);
  });

  it("should track job and show toast when Track is clicked", () => {
    mockMutate.mockImplementation((_payload, { onSuccess }) => onSuccess());

    render(<JobCard job={JOB} />);
    fireEvent.click(screen.getByRole("button", { name: /track forward deployed engineer at anthropic/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        role_title: "Forward Deployed Engineer",
        company: "Anthropic",
        current_stage: "To Apply",
        source: "board",
      }),
      expect.any(Object)
    );
    expect(toast.success).toHaveBeenCalledWith("Tracking Anthropic · Forward Deployed Engineer");
  });

  it("should render fallback text when role and company are null", () => {
    render(<JobCard job={{ ...JOB, role: null, company: null, location: null, remote_status: null, experience_level: null, score: null }} />);

    expect(screen.getByText("Untitled Role")).toBeInTheDocument();
    expect(screen.getByText("Unknown Company")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
