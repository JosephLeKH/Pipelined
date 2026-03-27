/** Tests for JobRow — verifies compact list row rendering and apply link. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import JobRow from "./JobRow";

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
  it("should render role and company", () => {
    // Arrange / Act
    render(<JobRow job={JOB} />);

    // Assert
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
  });

  it("should render an apply link with correct href", () => {
    // Arrange / Act
    render(<JobRow job={JOB} />);

    // Assert
    const link = screen.getByRole("link", { name: /apply/i });
    expect(link).toHaveAttribute("href", "https://beta.example.com/apply");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("should not render apply link when apply_url is null", () => {
    // Arrange
    const jobNoUrl = { ...JOB, apply_url: null };

    // Act
    render(<JobRow job={jobNoUrl} />);

    // Assert
    expect(screen.queryByRole("link", { name: /apply/i })).not.toBeInTheDocument();
  });

  it("should show stale badge when is_stale is true", () => {
    // Arrange
    const staleJob = { ...JOB, is_stale: true };

    // Act
    render(<JobRow job={staleJob} />);

    // Assert
    expect(screen.getByTestId("stale-badge")).toBeInTheDocument();
  });

  it("should not show stale badge when is_stale is false", () => {
    // Arrange / Act
    render(<JobRow job={JOB} />);

    // Assert
    expect(screen.queryByTestId("stale-badge")).not.toBeInTheDocument();
  });

  it("should render fallback text when role and company are null", () => {
    // Arrange
    const minimalJob = { ...JOB, role: null, company: null, apply_url: null };

    // Act
    render(<JobRow job={minimalJob} />);

    // Assert
    expect(screen.getByText("Untitled Role")).toBeInTheDocument();
    expect(screen.getByText("Unknown Company")).toBeInTheDocument();
  });

  it("should apply provided style prop for virtualization", () => {
    // Arrange
    const style = { position: "absolute", top: 0, height: 72 };

    // Act
    render(<JobRow job={JOB} style={style} />);

    // Assert
    const row = screen.getByRole("row");
    expect(row).toHaveStyle({ position: "absolute" });
  });
});
