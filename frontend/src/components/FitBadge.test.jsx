/** Tests for FitBadge color-coded fit score pill. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import FitBadge from "./FitBadge";

describe("FitBadge", () => {
  it("should show — and gray styling when score is null", () => {
    render(<FitBadge score={null} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("—");
    expect(badge.className).toMatch(/bg-gray/);
  });

  it("should show — and gray styling when score is undefined", () => {
    render(<FitBadge score={undefined} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("—");
    expect(badge.className).toMatch(/bg-gray/);
  });

  it("should show green styling for high fit score (80-100)", () => {
    render(<FitBadge score={85} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("85%");
    expect(badge.className).toMatch(/bg-green/);
  });

  it("should show green styling for score exactly at 80", () => {
    render(<FitBadge score={80} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge.className).toMatch(/bg-green/);
  });

  it("should show yellow styling for medium fit score (50-79)", () => {
    render(<FitBadge score={65} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("65%");
    expect(badge.className).toMatch(/bg-amber/);
  });

  it("should show yellow styling for score exactly at 50", () => {
    render(<FitBadge score={50} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge.className).toMatch(/bg-amber/);
  });

  it("should show orange styling for low-medium fit score (30-49)", () => {
    render(<FitBadge score={40} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("40%");
    expect(badge.className).toMatch(/bg-orange/);
  });

  it("should show orange styling for score exactly at 30", () => {
    render(<FitBadge score={30} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge.className).toMatch(/bg-orange/);
  });

  it("should show red styling for low fit score (0-29)", () => {
    render(<FitBadge score={15} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("15%");
    expect(badge.className).toMatch(/bg-red/);
  });

  it("should show red styling for score of 0", () => {
    render(<FitBadge score={0} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("0%");
    expect(badge.className).toMatch(/bg-red/);
  });

  it("should have correct aria-label for a numeric score", () => {
    render(<FitBadge score={72} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveAttribute("aria-label", "Fit score: 72%");
  });

  it("should have correct aria-label when score is null", () => {
    render(<FitBadge score={null} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveAttribute("aria-label", "Fit score: —");
  });
});
