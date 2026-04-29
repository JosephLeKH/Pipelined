import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SkeletonRow from "./SkeletonRow";

describe("SkeletonRow", () => {
  it("should render with data-testid skeleton-row", () => {
    render(<SkeletonRow />);

    expect(screen.getByTestId("skeleton-row")).toBeInTheDocument();
  });

  it("should have aria-hidden=true", () => {
    render(<SkeletonRow />);

    expect(screen.getByTestId("skeleton-row")).toHaveAttribute("aria-hidden", "true");
  });
});
