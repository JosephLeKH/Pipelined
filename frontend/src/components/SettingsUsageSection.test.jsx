import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsUsageSection from "./SettingsUsageSection";
import { TooltipProvider } from "./ui/tooltip";

function renderSection(user) {
  return render(
    <TooltipProvider>
      <SettingsUsageSection user={user} />
    </TooltipProvider>
  );
}

describe("SettingsUsageSection", () => {
  it("should render Usage & Plan heading", () => {
    renderSection({});

    expect(screen.getByText("Usage & Plan")).toBeInTheDocument();
  });

  it("should render progressbar for Applications with correct aria-valuenow", () => {
    renderSection({ application_count: 42, contact_count: 0, ai_scores_today: 0 });

    const bar = screen.getByRole("progressbar", { name: "Applications" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("should render progressbar for Contacts with correct aria-valuenow", () => {
    renderSection({ application_count: 0, contact_count: 15, ai_scores_today: 0 });

    const bar = screen.getByRole("progressbar", { name: "Contacts" });
    expect(bar).toHaveAttribute("aria-valuenow", "15");
    expect(bar).toHaveAttribute("aria-valuemax", "50");
  });

  it("should render unified AI usage section", () => {
    renderSection({ ai_scores_today: 3 });

    expect(screen.getByRole("heading", { name: "AI usage" })).toBeInTheDocument();
    expect(screen.getByText(/share this daily limit/i)).toBeInTheDocument();
  });

  it("should render progressbar for AI fit scores today with correct aria-valuenow", () => {
    renderSection({ application_count: 0, contact_count: 0, ai_scores_today: 7 });

    const bar = screen.getByRole("progressbar", { name: "AI fit scores today" });
    expect(bar).toHaveAttribute("aria-valuenow", "7");
    expect(bar).toHaveAttribute("aria-valuemax", "10");
  });

  it("should show zero usage when user prop has no counts", () => {
    renderSection(null);

    const bars = screen.getAllByRole("progressbar");
    bars.forEach((bar) => expect(bar).toHaveAttribute("aria-valuenow", "0"));
  });
});
