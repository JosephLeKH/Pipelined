/** Tests for FollowUpBanner — renders when follow-ups are due, hides on dismiss, fires onView. */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import FollowUpBanner from "./FollowUpBanner";

describe("FollowUpBanner", () => {
  it("should render when followUpsDue is greater than zero", () => {
    render(<FollowUpBanner followUpsDue={3} onView={vi.fn()} />);

    expect(screen.getByTestId("follow-up-banner")).toBeInTheDocument();
    expect(screen.getByText(/you have 3 follow-ups due/i)).toBeInTheDocument();
  });

  it("should use singular form for exactly one follow-up", () => {
    render(<FollowUpBanner followUpsDue={1} onView={vi.fn()} />);

    expect(screen.getByText(/you have 1 follow-up due/i)).toBeInTheDocument();
  });

  it("should not render when followUpsDue is zero", () => {
    render(<FollowUpBanner followUpsDue={0} onView={vi.fn()} />);

    expect(screen.queryByTestId("follow-up-banner")).not.toBeInTheDocument();
  });

  it("should not render when followUpsDue is null", () => {
    render(<FollowUpBanner followUpsDue={null} onView={vi.fn()} />);

    expect(screen.queryByTestId("follow-up-banner")).not.toBeInTheDocument();
  });

  it("should call onView when View button is clicked", () => {
    const onView = vi.fn();
    render(<FollowUpBanner followUpsDue={2} onView={onView} />);

    fireEvent.click(screen.getByRole("button", { name: /view/i }));

    expect(onView).toHaveBeenCalledOnce();
  });

  it("should hide the banner when dismissed", () => {
    render(<FollowUpBanner followUpsDue={2} onView={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(screen.queryByTestId("follow-up-banner")).not.toBeInTheDocument();
  });
});
