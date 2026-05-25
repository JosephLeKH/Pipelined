import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import MorningBriefSkeleton from "./MorningBriefSkeleton";

describe("MorningBriefSkeleton", () => {
  it("should render skeleton with mission-row dimensions", () => {
    render(<MorningBriefSkeleton />);

    const root = screen.getByTestId("morning-brief-skeleton");
    expect(root).toBeInTheDocument();

    const missionRows = root.querySelectorAll("li.border-b.border-border-1.px-3.py-3");
    expect(missionRows.length).toBeGreaterThanOrEqual(3);
  });

  it("should render weekly goal and collapsed brief placeholders", () => {
    render(<MorningBriefSkeleton />);

    expect(screen.getByTestId("skeleton-weekly-goal")).toHaveClass("h-16", "bg-surface-1");
    expect(screen.getByTestId("skeleton-brief-collapsed")).toHaveClass("h-14");
  });

  it("should use surface tokens instead of legacy card accents", () => {
    render(<MorningBriefSkeleton />);

    const root = screen.getByTestId("morning-brief-skeleton");
    expect(root.innerHTML).not.toMatch(/border-l-4/);
    expect(root.querySelector(".bg-muted")).toBeNull();
  });
});
