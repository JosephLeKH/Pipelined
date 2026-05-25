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

    expect(screen.getByRole("link", { name: /sign up — free/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/pipeline for/i);
  });
});
