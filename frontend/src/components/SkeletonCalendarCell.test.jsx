import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SkeletonCalendarCell from "./SkeletonCalendarCell";

describe("SkeletonCalendarCell", () => {
  it("should render with data-testid skeleton-calendar-cell", () => {
    render(<SkeletonCalendarCell />);

    expect(screen.getByTestId("skeleton-calendar-cell")).toBeInTheDocument();
  });

  it("should have aria-hidden=true", () => {
    render(<SkeletonCalendarCell />);

    expect(screen.getByTestId("skeleton-calendar-cell")).toHaveAttribute("aria-hidden", "true");
  });
});
