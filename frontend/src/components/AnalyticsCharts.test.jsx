/** Tests for AnalyticsCharts sub-components. */

import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

vi.mock("recharts/es6/chart/BarChart", () => ({ BarChart: ({ children }) => <div>{children}</div> }));
vi.mock("recharts/es6/chart/LineChart", () => ({ LineChart: ({ children }) => <div>{children}</div> }));
vi.mock("recharts/es6/cartesian/Bar", () => ({ Bar: () => null }));
vi.mock("recharts/es6/cartesian/Line", () => ({ Line: () => null }));
vi.mock("recharts/es6/cartesian/XAxis", () => ({ XAxis: () => null }));
vi.mock("recharts/es6/cartesian/YAxis", () => ({ YAxis: () => null }));
vi.mock("recharts/es6/cartesian/CartesianGrid", () => ({ CartesianGrid: () => null }));
vi.mock("recharts/es6/component/Tooltip", () => ({ Tooltip: () => null }));
vi.mock("recharts/es6/component/Legend", () => ({ Legend: () => null }));
vi.mock("recharts/es6/component/ResponsiveContainer", () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

import {
  AnalyticsMainCharts,
  AnalyticsFunnelSection,
  AnalyticsTagsTable,
  CHART_COLORS,
  CustomTooltip,
} from "./AnalyticsCharts";

const WEEKLY_DATA = [
  { week: "2024-W01", count: 5 },
  { week: "2024-W02", count: 3 },
];

const STAGE_FUNNEL = [
  { stage: "Applied", count: 10 },
  { stage: "Phone Screen", count: 5 },
];

const RESPONSE_DATA = [
  { month: "Jan", rate: 0.4 },
];

const TOP_COMPANIES = [
  { company: "Acme", count: 3 },
];

const FUNNEL_DATA = [
  { stage: "Applied", entered_count: 20, exited_to_next_count: 10, conversion_rate: 0.5, avg_days_in_stage: 7.2 },
  { stage: "Offer", entered_count: 5, exited_to_next_count: 2, conversion_rate: 0.4, avg_days_in_stage: null },
];

const TAG_DATA = [
  { tag: "remote", application_count: 8, offer_count: 2, offer_rate: 0.25 },
];

const ANALYTICS = {
  applications_by_week: WEEKLY_DATA,
  stage_funnel: STAGE_FUNNEL,
  response_rate_by_month: RESPONSE_DATA,
  top_companies: TOP_COMPANIES,
};

describe("CHART_COLORS", () => {
  it("should use Cardinal Red as series1 per PRD chart palette", () => {
    expect(CHART_COLORS.series1).toBe("#8C1515");
    expect(CHART_COLORS.series2).toBe("#3B82F6");
    expect(CHART_COLORS.series3).toBe("#175E54");
  });
});

describe("CustomTooltip", () => {
  it("should render token-styled tooltip surface", () => {
    render(
      <CustomTooltip
        active
        label="2026-W01"
        payload={[{ dataKey: "count", name: "Applications", value: 5 }]}
      />
    );
    const tooltip = screen.getByTestId("analytics-chart-tooltip");
    expect(tooltip).toHaveClass("bg-surface-0", "border-border-2", "text-xs");
  });
});

describe("AnalyticsMainCharts", () => {
  it("should render Applications per Week heading", () => {
    render(<AnalyticsMainCharts analytics={ANALYTICS} />);
    expect(screen.getByText("Applications per Week")).toBeInTheDocument();
  });

  it("should render Stage Funnel heading", () => {
    render(<AnalyticsMainCharts analytics={ANALYTICS} />);
    expect(screen.getByText("Stage Funnel")).toBeInTheDocument();
  });

  it("should render Response Rate by Month heading", () => {
    render(<AnalyticsMainCharts analytics={ANALYTICS} />);
    expect(screen.getByText("Response Rate by Month")).toBeInTheDocument();
  });

  it("should render Top 10 Companies heading", () => {
    render(<AnalyticsMainCharts analytics={ANALYTICS} />);
    expect(screen.getByText("Top 10 Companies Applied To")).toBeInTheDocument();
  });

  it("should show empty chart message when all series values are zero", () => {
    render(
      <AnalyticsMainCharts
        analytics={{
          applications_by_week: [{ week: "2026-W01", count: 0 }],
          stage_funnel: [{ stage: "Applied", count: 0 }],
          response_rate_by_month: [{ month: "2026-01", rate: 0 }],
          top_companies: [{ company: "Acme", count: 0 }],
        }}
      />
    );
    expect(screen.getAllByText("No data for this range").length).toBeGreaterThanOrEqual(1);
  });
});

describe("AnalyticsFunnelSection", () => {
  it("should render Conversion Rates by Stage heading", () => {
    render(<AnalyticsFunnelSection funnelData={FUNNEL_DATA} />);
    expect(screen.getByText("Conversion Rates by Stage")).toBeInTheDocument();
  });

  it("should render stage name in conversion table", () => {
    render(<AnalyticsFunnelSection funnelData={FUNNEL_DATA} />);
    expect(screen.getAllByText("Applied").length).toBeGreaterThanOrEqual(1);
  });

  it("should render nothing when funnelData is empty", () => {
    const { container } = render(<AnalyticsFunnelSection funnelData={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("AnalyticsTagsTable", () => {
  it("should render Tags heading", () => {
    render(<AnalyticsTagsTable tagOfferRates={TAG_DATA} />);
    expect(screen.getByText("Tags")).toBeInTheDocument();
  });

  it("should render tag name and offer rate", () => {
    render(<AnalyticsTagsTable tagOfferRates={TAG_DATA} />);
    expect(screen.getByText("remote")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });
});
