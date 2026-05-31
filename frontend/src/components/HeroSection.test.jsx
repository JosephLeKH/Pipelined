/** Smoke test: HeroSection renders without crash. */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";

import HeroSection from "./HeroSection";

describe("HeroSection", () => {
  it("should render without crashing", () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /get started/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/your job hunt/i);
  });

  it("should not have a demo button", () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>
    );

    expect(screen.queryByRole("button", { name: /watch the demo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should render only the Get started button in the CTA section", () => {
    render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>
    );

    // Get all links to find the "Get started" link
    const links = screen.getAllByRole("link");
    const getStartedLink = links.find(link => link.textContent.includes("Get started"));
    expect(getStartedLink).toBeInTheDocument();

    // Verify there's no "Watch the demo" button
    expect(screen.queryByText(/watch the demo/i)).not.toBeInTheDocument();
  });
});
