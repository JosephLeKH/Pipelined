/** Tests for the Pricing page. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";

import Pricing from "./Pricing";

function renderPricing() {
  return render(
    <MemoryRouter>
      <Pricing />
    </MemoryRouter>
  );
}

describe("Pricing page", () => {
  it("should render Free and Pro tier headings", () => {
    renderPricing();

    expect(screen.getByRole("heading", { name: /^free$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^pro$/i })).toBeInTheDocument();
  });

  it("should display correct pricing amounts", () => {
    renderPricing();

    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("$5")).toBeInTheDocument();
  });

  it("should have accessible CTA links for both tiers", () => {
    renderPricing();

    expect(screen.getByRole("link", { name: /get started/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /upgrade/i })).toBeInTheDocument();
  });

  it("should show Pro highlight badge and Cardinal border card", () => {
    renderPricing();

    expect(screen.getByText(/best for full season/i)).toBeInTheDocument();
  });

  it("should render PRD feature bullets for both tiers", () => {
    renderPricing();

    expect(screen.getByText(/50 applications/i)).toBeInTheDocument();
    expect(screen.getByText(/unlimited co-pilot/i)).toBeInTheDocument();
    expect(screen.getByText(/today \+ morning brief/i)).toBeInTheDocument();
  });

  it("should render marketing nav and footer chrome", () => {
    renderPricing();

    expect(screen.getByRole("navigation", { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("should include Stanford affiliation disclaimer in FAQ", async () => {
    const user = userEvent.setup();
    renderPricing();

    const stanfordQuestion = screen.getByText(/is the stanford branding affiliated/i);
    expect(stanfordQuestion).toBeInTheDocument();

    await user.click(stanfordQuestion);

    expect(
      screen.getByText(/not affiliated with or endorsed by stanford university/i)
    ).toBeInTheDocument();
  });
});
