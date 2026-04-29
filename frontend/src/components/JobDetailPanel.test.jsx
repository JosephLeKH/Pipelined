import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import JobDetailPanel from "./JobDetailPanel";

vi.mock("../hooks/useApplications", () => ({
  useCreateApplication: vi.fn(),
}));

vi.mock("./CompanyLogo", () => ({
  default: () => <div data-testid="company-logo" />,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useCreateApplication } from "../hooks/useApplications";

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
};

describe("JobDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCreateApplication.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it("should render the job role and company", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
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

  it("should render apply link when apply_url is provided", () => {
    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);

    const link = screen.getByRole("link", { name: /apply on company site/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://acme.com/apply");
  });

  it("should not render apply link when apply_url is absent", () => {
    const job = { ...JOB_FIXTURE, apply_url: null };

    render(<JobDetailPanel job={job} onClose={vi.fn()} />);

    expect(screen.queryByRole("link", { name: /apply/i })).not.toBeInTheDocument();
  });

  it("should show Saved! after successful save to pipeline", () => {
    mockMutate.mockImplementation((_body, { onSuccess }) => onSuccess());

    render(<JobDetailPanel job={JOB_FIXTURE} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /save to pipeline/i }));

    expect(screen.getByRole("button", { name: /saved!/i })).toBeInTheDocument();
  });

  it("should show stale badge when job.is_stale is true", () => {
    const job = { ...JOB_FIXTURE, is_stale: true };

    render(<JobDetailPanel job={job} onClose={vi.fn()} />);

    expect(screen.getByText("May be expired")).toBeInTheDocument();
  });
});
