import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PendingOpportunityCard from "./PendingOpportunityCard";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const MOCK_OPPORTUNITY = {
  id: "opp1",
  match_score: 88,
  match_reason: "Your 2 yrs of FastAPI maps to their backend platform team.",
  cover_letter: { subject: "Application", body: "Dear hiring team" },
  resume_tips: { summary: "Highlight backend work", bullet_suggestions: ["Add metrics"] },
  talking_points: ["Led API migration at Acme", "Built Stripe payments at Beta"],
  listing_company: "Acme",
  listing_role: "Backend Engineer",
  listing_apply_url: "https://example.com/jobs/acme",
};

function renderCard(overrides = {}) {
  return render(
    <PendingOpportunityCard
      opportunity={{ ...MOCK_OPPORTUNITY, ...overrides }}
      onApprove={vi.fn()}
      onDismiss={vi.fn()}
      isApproving={false}
      isDismissing={false}
    />
  );
}

describe("PendingOpportunityCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("should render Watchlist badge when source is watchlist", () => {
    renderCard({ source: "watchlist" });
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
  });

  it("should render FitBadge and full match reason inline", () => {
    renderCard();
    expect(screen.getByTestId("fit-badge")).toHaveTextContent("88%");
    expect(screen.getByText(/suggested by autopilot/i)).toBeInTheDocument();
    expect(
      screen.getByText("Your 2 yrs of FastAPI maps to their backend platform team.")
    ).toBeInTheDocument();
  });

  it("should label the primary button as 'Add to pipeline'", () => {
    renderCard();
    expect(screen.getByRole("button", { name: /add acme · backend engineer to pipeline/i })).toBeInTheDocument();
    expect(screen.getByText("Add to pipeline")).toBeInTheDocument();
  });

  it("should always render talking points without a Why? toggle", () => {
    renderCard();
    expect(screen.getByText("Led API migration at Acme")).toBeInTheDocument();
    expect(screen.getByText("Built Stripe payments at Beta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /why\?/i })).not.toBeInTheDocument();
  });

  it("should cap talking points at 3", () => {
    renderCard({
      talking_points: ["one", "two", "three", "four", "five"],
    });
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("three")).toBeInTheDocument();
    expect(screen.queryByText("four")).not.toBeInTheDocument();
  });

  it("should toggle cover letter panel and copy body with subject", async () => {
    renderCard();
    expect(screen.queryByText("Dear hiring team")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^cover letter$/i }));
    expect(screen.getByText("Dear hiring team")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /copy cover letter/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "Subject: Application\n\nDear hiring team"
    );
    expect(screen.getByRole("button", { name: /cover letter copied/i })).toBeInTheDocument();
  });

  it("should swap to resume tips panel when its toggle is clicked", async () => {
    renderCard();

    await userEvent.click(screen.getByRole("button", { name: /^cover letter$/i }));
    expect(screen.getByText("Dear hiring team")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^resume tips$/i }));
    expect(screen.queryByText("Dear hiring team")).not.toBeInTheDocument();
    expect(screen.getByText("Highlight backend work")).toBeInTheDocument();
    expect(screen.getByText("Add metrics")).toBeInTheDocument();
  });
});
