/** Tests for the Pricing page. */

import { render, screen } from "@testing-library/react";
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

    expect(screen.getByRole("heading", { name: /free/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /pro/i })).toBeInTheDocument();
  });

  it("should display correct pricing amounts", () => {
    renderPricing();

    expect(screen.getByText("$0")).toBeInTheDocument();
    expect(screen.getByText("$9")).toBeInTheDocument();
  });

  it("should have accessible CTA buttons and links", () => {
    renderPricing();

    const freeLinks = screen.getAllByRole("link", { name: /get started free/i });
    expect(freeLinks.length).toBeGreaterThanOrEqual(1);

    const proButton = screen.getByRole("button", { name: /upgrade to pro/i });
    expect(proButton).toBeInTheDocument();
  });

  it("should render feature list items for both tiers", () => {
    renderPricing();

    expect(screen.getAllByText(/chrome extension/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/interview calendar/i).length).toBeGreaterThanOrEqual(2);
  });
});
