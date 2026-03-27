/** Tests for JobCard — verifies job data rendering, badges, and apply link. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import JobCard from "./JobCard";

const JOB = {
  id: "job1",
  company: "Acme Corp",
  role: "Software Engineer",
  location: "San Francisco, CA",
  remote_status: "hybrid",
  experience_level: "mid",
  company_type: "startup",
  salary_range: "$120k–$160k",
  apply_url: "https://acme.example.com/apply",
  date_posted: "2026-03-01T00:00:00Z",
  is_stale: false,
  ingested_at: "2026-03-02T00:00:00Z",
};

describe("JobCard", () => {
  it("should render company and role", () => {
    // Arrange / Act
    render(<JobCard job={JOB} />);

    // Assert
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("should render location and salary range", () => {
    // Arrange / Act
    render(<JobCard job={JOB} />);

    // Assert
    expect(screen.getByText("San Francisco, CA")).toBeInTheDocument();
    expect(screen.getByText("$120k–$160k")).toBeInTheDocument();
  });

  it("should render remote status, experience level, and company type badges", () => {
    // Arrange / Act
    render(<JobCard job={JOB} />);

    // Assert
    expect(screen.getByText("hybrid")).toBeInTheDocument();
    expect(screen.getByText("mid")).toBeInTheDocument();
    expect(screen.getByText("startup")).toBeInTheDocument();
  });

  it("should render an apply link with correct href", () => {
    // Arrange / Act
    render(<JobCard job={JOB} />);

    // Assert
    const link = screen.getByRole("link", { name: /apply/i });
    expect(link).toHaveAttribute("href", "https://acme.example.com/apply");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should not render apply link when apply_url is missing", () => {
    // Arrange
    const jobNoUrl = { ...JOB, apply_url: null };

    // Act
    render(<JobCard job={jobNoUrl} />);

    // Assert
    expect(screen.queryByRole("link", { name: /apply/i })).not.toBeInTheDocument();
  });

  it("should show stale badge when is_stale is true", () => {
    // Arrange
    const staleJob = { ...JOB, is_stale: true };

    // Act
    render(<JobCard job={staleJob} />);

    // Assert
    expect(screen.getByTestId("stale-badge")).toBeInTheDocument();
  });

  it("should not show stale badge when is_stale is false", () => {
    // Arrange / Act
    render(<JobCard job={JOB} />);

    // Assert
    expect(screen.queryByTestId("stale-badge")).not.toBeInTheDocument();
  });

  it("should render fallback text when role and company are null", () => {
    // Arrange
    const minimalJob = {
      ...JOB,
      role: null,
      company: null,
      location: null,
      apply_url: null,
    };

    // Act
    render(<JobCard job={minimalJob} />);

    // Assert
    expect(screen.getByText("Untitled Role")).toBeInTheDocument();
    expect(screen.getByText("Unknown Company")).toBeInTheDocument();
  });
});
