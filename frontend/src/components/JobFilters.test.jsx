import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { JobFilters } from "./JobFilters";

function renderWithRouter(initialSearch = "") {
  return render(
    <MemoryRouter initialEntries={[`/jobs${initialSearch}`]}>
      <JobFilters />
    </MemoryRouter>
  );
}

describe("JobFilters", () => {
  it("should render Role filter group label", () => {
    renderWithRouter();

    expect(screen.getByText(/role:/i)).toBeInTheDocument();
  });

  it("should render Experience filter group label", () => {
    renderWithRouter();

    expect(screen.getByText(/experience:/i)).toBeInTheDocument();
  });

  it("should render filter chips for all role type options", () => {
    renderWithRouter();

    expect(screen.getByRole("button", { name: /full time/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /internship/i }).length).toBeGreaterThan(0);
  });

  it("should mark chip as active when its value matches the current search param", () => {
    renderWithRouter("?role_type=full_time");

    const fullTimeBtn = screen.getByRole("button", { name: /full time/i });
    expect(fullTimeBtn).toHaveClass("bg-brand-500");
  });

  it("should clear param when clicking an already-active chip", () => {
    renderWithRouter("?role_type=full_time");

    const fullTimeBtn = screen.getByRole("button", { name: /full time/i });

    expect(fullTimeBtn).toHaveClass("bg-brand-500");

    fireEvent.click(fullTimeBtn);

    expect(fullTimeBtn).not.toHaveClass("bg-brand-500");
  });
});
