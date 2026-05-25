import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { OfferComparisonCard } from "./OfferComparisonCard";

const makeApp = (overrides = {}) => ({
  id: "app1",
  company: "Anthropic",
  role_title: "Research Engineer",
  offer_details: {
    base_salary: 200000,
    equity_annual_value: 80000,
    signing_bonus: 30000,
  },
  ...overrides,
});

describe("OfferComparisonCard", () => {
  it("should render Total Y1 and Best badge when isBest", () => {
    render(
      <OfferComparisonCard app={makeApp()} isBest onSave={() => {}} />
    );

    expect(screen.getByText("Total Y1")).toBeInTheDocument();
    expect(screen.getByText("$310,000")).toBeInTheDocument();
    expect(screen.getByText("Best")).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveClass("border-brand-700");
  });
});
