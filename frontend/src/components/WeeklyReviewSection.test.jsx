import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import WeeklyReviewSection, { WeeklyReviewTeaser } from "./WeeklyReviewSection";

const MOCK_REVIEW = {
  week_start: "2026-05-19",
  response_rate: 0.42,
  ghost_rate: 0.25,
  velocity: {
    applied_this_week: 3,
    weekly_goal: 5,
    percent_of_goal: 0.6,
  },
  stale_applications: [
    {
      id: "507f1f77bcf86cd799439011",
      company: "Acme",
      role_title: "Engineer",
      days_since_update: 16,
    },
  ],
};

function renderSection(props) {
  return render(
    <MemoryRouter>
      <WeeklyReviewSection {...props} />
    </MemoryRouter>,
  );
}

describe("WeeklyReviewSection", () => {
  it("should render response rate, ghost rate, and velocity metrics", () => {
    renderSection({ review: MOCK_REVIEW, isLoading: false });

    expect(screen.getByText("Weekly review")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("3 / 5 applied")).toBeInTheDocument();
  });

  it("should link stale applications to the dashboard", () => {
    renderSection({ review: MOCK_REVIEW, isLoading: false });

    const link = screen.getByRole("link", { name: /Acme · Engineer/i });
    expect(link).toHaveAttribute("href", "/dashboard?selected=507f1f77bcf86cd799439011");
  });

  it("should show loading skeleton while fetching", () => {
    renderSection({ review: null, isLoading: true });

    expect(screen.getByLabelText("Weekly review")).toBeInTheDocument();
    expect(screen.queryByText("Response rate")).not.toBeInTheDocument();
  });

  it("should show 404 empty state when no weekly review exists", () => {
    const error = { status: 404 };
    renderSection({ review: null, isLoading: false, error });

    expect(screen.getByText(/No weekly review yet/i)).toBeInTheDocument();
    expect(screen.getByText(/your first review will appear at the end of the week/i)).toBeInTheDocument();
  });

  it("should show error state with retry button on non-404 errors", () => {
    const error = { status: 500 };
    renderSection({ review: null, isLoading: false, error });

    expect(screen.getByText(/Couldn't load weekly review/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();
  });
});

describe("WeeklyReviewTeaser", () => {
  it("should render Sunday teaser copy and read link", () => {
    render(
      <MemoryRouter>
        <WeeklyReviewTeaser
          review={MOCK_REVIEW}
          isLoading={false}
          onReadReview={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("This week's review")).toBeInTheDocument();
    expect(screen.getByText("You shipped 3 applications this week.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /read your sunday review/i })).toBeInTheDocument();
  });
});
