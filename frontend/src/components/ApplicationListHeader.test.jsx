/** Smoke test: ApplicationListHeader renders without crash. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ApplicationListHeader } from "./ApplicationListHeader";

describe("ApplicationListHeader", () => {
  it("should render without crashing", () => {
    render(
      <ApplicationListHeader
        sortBy="date_applied"
        sortOrder="desc"
        onSort={vi.fn()}
        allSelected={false}
        onSelectAll={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Select all applications")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByTestId("application-list-header")).toHaveClass("h-8", "bg-surface-1", "md:flex");
  });
});
