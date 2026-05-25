/** Tests for FitBadge color-coded fit score pill. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import FitBadge from "./FitBadge";

describe("FitBadge", () => {
  it("should render nothing when score is null", () => {
    const { container } = render(<FitBadge score={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render nothing when score is undefined", () => {
    const { container } = render(<FitBadge score={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should show green styling for high fit score (80-100)", () => {
    render(<FitBadge score={85} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("85%");
    expect(badge.className).toMatch(/text-status-success/);
  });

  it("should show green styling for score exactly at 80", () => {
    render(<FitBadge score={80} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge.className).toMatch(/text-status-success/);
  });

  it("should show yellow styling for medium fit score (50-79)", () => {
    render(<FitBadge score={65} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("65%");
    expect(badge.className).toMatch(/text-status-warn/);
  });

  it("should show yellow styling for score exactly at 50", () => {
    render(<FitBadge score={50} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge.className).toMatch(/text-status-warn/);
  });

  it("should show orange styling for low-medium fit score (30-49)", () => {
    render(<FitBadge score={40} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("40%");
    expect(badge.className).toMatch(/text-status-orange/);
  });

  it("should show orange styling for score exactly at 30", () => {
    render(<FitBadge score={30} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge.className).toMatch(/text-status-orange/);
  });

  it("should show red styling for low fit score (0-29)", () => {
    render(<FitBadge score={15} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("15%");
    expect(badge.className).toMatch(/text-brand-700/);
  });

  it("should show red styling for score of 0", () => {
    render(<FitBadge score={0} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("0%");
    expect(badge.className).toMatch(/text-brand-700/);
  });

  it("should have correct aria-label for a numeric score", () => {
    render(<FitBadge score={72} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveAttribute("aria-label", "Fit score: 72%");
  });
});
