/** Tests for FitBadge sparkle + percent display (PRD-04 §7.4). */

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

  it("should show sparkle and text-text-1 for strong fit score (80-100)", () => {
    render(<FitBadge score={85} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("85%");
    expect(badge.querySelector("svg")).toBeInTheDocument();
    expect(badge.textContent).toMatch(/85%/);
    expect(badge.className).not.toMatch(/rounded-full/);
    expect(badge.querySelector(".text-text-1")).toBeInTheDocument();
  });

  it("should show sparkle at score exactly 80", () => {
    render(<FitBadge score={80} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge.querySelector("svg")).toBeInTheDocument();
    expect(badge.querySelector(".text-text-1")).toBeInTheDocument();
  });

  it("should not show sparkle for good fit score (60-79)", () => {
    render(<FitBadge score={65} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("65%");
    expect(badge.querySelector("svg")).not.toBeInTheDocument();
    expect(badge.querySelector(".text-text-2")).toBeInTheDocument();
  });

  it("should use text-text-2 for score exactly at 60", () => {
    render(<FitBadge score={60} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge.querySelector(".text-text-2")).toBeInTheDocument();
  });

  it("should use text-text-3 for low fit score (0-39)", () => {
    render(<FitBadge score={15} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("15%");
    expect(badge.querySelector("svg")).not.toBeInTheDocument();
    expect(badge.querySelector(".text-text-3")).toBeInTheDocument();
  });

  it("should use text-text-3 for score of 0", () => {
    render(<FitBadge score={0} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveTextContent("0%");
    expect(badge.querySelector(".text-text-3")).toBeInTheDocument();
  });

  it("should have correct data-testid for a numeric score", () => {
    render(<FitBadge score={72} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("72%");
  });

  it("should have tooltip with fit score legend", () => {
    render(<FitBadge score={72} />);
    const badge = screen.getByTestId("fit-badge");

    expect(badge).toHaveClass("cursor-help");
  });
});
