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
  match_reason: "Strong Python overlap",
  cover_letter: { subject: "Application", body: "Dear hiring team" },
  resume_tips: { summary: "Highlight backend work", bullet_suggestions: ["Add metrics"] },
  talking_points: ["5 years Python", "Led API migration"],
  listing_company: "Acme",
  listing_role: "Backend Engineer",
  listing_apply_url: "https://example.com/jobs/acme",
};

describe("PendingOpportunityCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("should render Watchlist badge when source is watchlist", () => {
    render(
      <PendingOpportunityCard
        opportunity={{ ...MOCK_OPPORTUNITY, source: "watchlist" }}
        onApprove={vi.fn()}
        onDismiss={vi.fn()}
        isApproving={false}
        isDismissing={false}
      />
    );

    expect(screen.getByText("Watchlist")).toBeInTheDocument();
  });

  it("should render FitBadge for match score without visible reason", () => {
    render(
      <PendingOpportunityCard
        opportunity={MOCK_OPPORTUNITY}
        onApprove={vi.fn()}
        onDismiss={vi.fn()}
        isApproving={false}
        isDismissing={false}
      />
    );

    expect(screen.getByTestId("fit-badge")).toHaveTextContent("88%");
    expect(screen.getByText("Fit score")).toBeInTheDocument();
    expect(screen.queryByText("Strong Python overlap")).not.toBeInTheDocument();
  });

  it("should render FitBadge and hide match reason until Why is clicked", async () => {
    render(
      <PendingOpportunityCard
        opportunity={MOCK_OPPORTUNITY}
        onApprove={vi.fn()}
        onDismiss={vi.fn()}
        isApproving={false}
        isDismissing={false}
      />
    );

    expect(screen.getByTestId("fit-badge")).toHaveTextContent("88%");
    expect(screen.queryByText("Strong Python overlap")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /why\?/i }));
    expect(screen.getByText("Strong Python overlap")).toBeInTheDocument();
  });

  it("should expand cover letter and copy to clipboard with success feedback", async () => {
    render(
      <PendingOpportunityCard
        opportunity={MOCK_OPPORTUNITY}
        onApprove={vi.fn()}
        onDismiss={vi.fn()}
        isApproving={false}
        isDismissing={false}
      />
    );

    expect(screen.queryByText("Dear hiring team")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /cover letter draft/i }));
    expect(screen.getByText("Dear hiring team")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /copy cover letter/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "Subject: Application\n\nDear hiring team"
    );
    expect(screen.getByRole("button", { name: /cover letter copied/i })).toBeInTheDocument();
  });

  it("should render talking points and apply pack hint", () => {
    render(
      <PendingOpportunityCard
        opportunity={MOCK_OPPORTUNITY}
        onApprove={vi.fn()}
        onDismiss={vi.fn()}
        isApproving={false}
        isDismissing={false}
      />
    );

    expect(screen.getByText("Talking points")).toBeInTheDocument();
    expect(screen.getByText("5 years Python")).toBeInTheDocument();
    expect(screen.getByText(/open apply pack in the application detail/i)).toBeInTheDocument();
  });
});
