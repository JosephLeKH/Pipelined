/** Dark-theme regression tests for PRD-07 analytics chart surfaces. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { CustomTooltip, AnalyticsMainCharts } from "./AnalyticsCharts";
import { meetsWcagAaBody } from "../lib/wcagContrast";

const DARK_SURFACE_0 = "#08090A";
const DARK_TEXT_1 = "#F4F4F5";
const DARK_TEXT_3 = "#858589";

describe("PRD-07 analytics — dark theme", () => {
  beforeEach(() => {
    document.documentElement.classList.add("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("should render CustomTooltip with surface and text tokens readable on dark bg", () => {
    render(
      <CustomTooltip
        active
        label="2026-W01"
        payload={[{ dataKey: "count", name: "Applications", value: 5 }]}
      />
    );

    const tooltip = screen.getByTestId("analytics-chart-tooltip");
    expect(tooltip).toHaveClass("bg-surface-0", "border-border-2", "text-text-1");
    expect(meetsWcagAaBody(DARK_TEXT_1, DARK_SURFACE_0)).toBe(true);
    expect(meetsWcagAaBody(DARK_TEXT_3, DARK_SURFACE_0)).toBe(true);
  });

  it("should render empty chart message with text-3 on surface-0", () => {
    render(
      <AnalyticsMainCharts
        analytics={{
          applications_by_week: [{ week: "2026-W01", count: 0 }],
          stage_funnel: [],
          response_rate_by_month: [{ month: "2026-01", rate: 0 }],
          top_companies: [],
        }}
      />
    );

    const emptyMessages = screen.getAllByText("No data for this range");
    expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
    emptyMessages.forEach((node) => {
      expect(node).toHaveClass("text-text-3", "bg-surface-0");
    });
  });

  it("should meet WCAG AA contrast for dark chart axis label tokens", () => {
    expect(meetsWcagAaBody(DARK_TEXT_3, DARK_SURFACE_0)).toBe(true);
  });
});
