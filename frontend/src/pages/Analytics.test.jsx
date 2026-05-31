/** Tests for Analytics page — renders charts, empty state, date range selector. */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import Analytics from "./Analytics";
import { passthroughHandlers } from "../test/passthroughHandlers";
import { withTooltipProvider } from "../test/testProviders";

const FUNNEL_DATA = [
  { stage: "Applied", entered_count: 10, exited_to_next_count: 7, conversion_rate: 0.7, avg_days_in_stage: 5.2, dropped_count: 3 },
  { stage: "Phone Screen", entered_count: 7, exited_to_next_count: 3, conversion_rate: 0.43, avg_days_in_stage: 8.1, dropped_count: 4 },
  { stage: "Offer", entered_count: 3, exited_to_next_count: 0, conversion_rate: 0.0, avg_days_in_stage: 25.0, dropped_count: 3 },
];

const ANALYTICS_FULL = {
  applications_by_week: [
    { week: "2026-W01", count: 3 },
    { week: "2026-W02", count: 5 },
  ],
  stage_funnel: [
    { stage: "Applied", count: 8 },
    { stage: "Phone Screen", count: 2 },
  ],
  response_rate_by_month: [{ month: "2026-01", rate: 0.25 }],
  top_companies: [
    { company: "Acme", count: 4 },
    { company: "Beta Co", count: 2 },
  ],
};

const ANALYTICS_EMPTY = {
  applications_by_week: [],
  stage_funnel: [{ stage: "Applied", count: 2 }],
  response_rate_by_month: [],
  top_companies: [],
};

const STATS_DATA = {
  total_applied: 10,
  active_count: 8,
  response_rate: 0.25,
  avg_days_to_first_response: 4.2,
  stale_count: 1,
  applied_this_week: 3,
  current_streak: 2,
  tag_offer_rates: [],
};

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: { id: "u1", email: "test@example.com", display_name: "Test" },
    })
  ),
  http.get("/api/applications/analytics", () =>
    HttpResponse.json({ data: ANALYTICS_FULL })
  ),
  http.get("/api/applications/funnel", () =>
    HttpResponse.json({ data: FUNNEL_DATA }),
  ),
  http.get("/api/applications/stats", () =>
    HttpResponse.json({ data: STATS_DATA })
  ),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderAnalytics() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/analytics"]}>
          <AuthProvider>
            {withTooltipProvider(<Analytics />)}
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("Analytics", () => {
  it("should render the page heading", async () => {
    renderAnalytics();

    expect(await screen.findByRole("heading", { name: /analytics/i })).toBeInTheDocument();
  });

  it("should render date range buttons", async () => {
    renderAnalytics();

    expect(await screen.findByText("Last 30 days")).toBeInTheDocument();
    expect(screen.getByText("Last 90 days")).toBeInTheDocument();
    expect(screen.getByText("Last 180 days")).toBeInTheDocument();
    expect(screen.getByText("All time")).toBeInTheDocument();
  });

  it("should render KPI tiles with metrics from analytics and stats", async () => {
    renderAnalytics();

    await screen.findByText("Applications per Week");

    expect(screen.getByText("Interviews")).toBeInTheDocument();
    expect(screen.getByText("Reply rate")).toBeInTheDocument();
    expect(screen.getByText("Avg response")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(screen.getByText("4.2 days")).toBeInTheDocument();

    const kpiGrid = screen.getByText("Interviews").closest(".grid");
    expect(kpiGrid).toHaveTextContent("Applied");
    expect(kpiGrid).toHaveTextContent("10");
    expect(kpiGrid).toHaveTextContent("2");
  });

  it("should show positive delta in success color when applied trend improves", async () => {
    renderAnalytics();

    // weeks: W01=3, W02=5 → recent 5 vs prior 3 → +67%
    const delta = await screen.findByText(/67%/);
    expect(delta).toHaveClass("text-status-success");
    expect(delta.textContent).toMatch(/↑/);
  });

  it("should render chart section headings when data has enough entries", async () => {
    renderAnalytics();

    expect(await screen.findByText("Applications per Week")).toBeInTheDocument();
    expect(screen.queryByText("Stage Funnel")).not.toBeInTheDocument();
    expect(screen.getByText("Response Rate by Month")).toBeInTheDocument();
    expect(screen.getByText("Top 10 Companies Applied To")).toBeInTheDocument();
  });

  it("should show empty state when total applications is below threshold", async () => {
    server.use(
      http.get("/api/applications/analytics", () =>
        HttpResponse.json({ data: ANALYTICS_EMPTY })
      )
    );

    renderAnalytics();

    expect(
      await screen.findByText("Not enough data yet")
    ).toBeInTheDocument();
  });

  it("should highlight the active date range button", async () => {
    renderAnalytics();

    // Default is 90 days — wait for page to render then check active state
    const btn = await screen.findByText("Last 90 days");
    expect(btn.className).toMatch(/bg-primary/);
  });

  it("should switch date range on button click", async () => {
    renderAnalytics();

    await screen.findByText("Last 90 days");
    await userEvent.click(screen.getByText("Last 30 days"));

    expect(screen.getByText("Last 30 days").className).toMatch(/bg-primary/);
  });

  it("should render the pipeline funnel section heading", async () => {
    renderAnalytics();

    expect(await screen.findByText("Pipeline funnel")).toBeInTheDocument();
  });

  it("should render drop-off between funnel stages", async () => {
    renderAnalytics();

    // Applied 10 → Phone Screen 7: −30% drop-off (3 lost)
    expect(await screen.findByText(/−30% drop-off \(3 lost\)/)).toBeInTheDocument();
  });

  it("should render the conversion rates table heading", async () => {
    renderAnalytics();

    expect(await screen.findByText("Conversion Rates by Stage")).toBeInTheDocument();
  });

  it("should show stage names in the conversion table", async () => {
    renderAnalytics();

    await screen.findByText("Conversion Rates by Stage");

    expect(screen.getAllByText("Applied").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Phone Screen").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Offer").length).toBeGreaterThanOrEqual(1);
  });

  it("should color-code high conversion rate in brand color", async () => {
    renderAnalytics();

    await screen.findByText("Conversion Rates by Stage");

    // Applied → Phone Screen: 70% → brand (high conversion)
    const cell = screen.getByText("70%");
    expect(cell.className).toMatch(/text-primary/);
  });

  it("should color-code mid conversion rate in amber", async () => {
    renderAnalytics();

    await screen.findByText("Conversion Rates by Stage");

    // Phone Screen → Offer: 43% → amber
    const cell = screen.getByText("43%");
    expect(cell.className).toMatch(/text-warning/);
  });

  it("should highlight avg_days_in_stage above 21 in rose", async () => {
    renderAnalytics();

    await screen.findByText("Conversion Rates by Stage");

    // Offer avg_days = 25.0 > 21 → rose
    const cell = screen.getByText("25.0d");
    expect(cell.className).toMatch(/text-destructive/);
  });

  it("should show retry button when analytics loading fails", async () => {
    server.use(
      http.get("/api/applications/analytics", () => HttpResponse.error()),
    );

    renderAnalytics();

    expect(await screen.findByText("Failed to load analytics.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry loading analytics/i })).toBeInTheDocument();
  });

  it("should call refetch when retry is clicked", async () => {
    let callCount = 0;
    server.use(
      http.get("/api/applications/analytics", () => {
        callCount += 1;
        return HttpResponse.error();
      }),
    );

    renderAnalytics();

    await screen.findByText("Failed to load analytics.");
    const before = callCount;

    fireEvent.click(screen.getByRole("button", { name: /retry loading analytics/i }));

    await new Promise((r) => setTimeout(r, 50));
    expect(callCount).toBeGreaterThan(before);
  });

  it("should show dash for last stage conversion", async () => {
    renderAnalytics();

    await screen.findByText("Conversion Rates by Stage");

    // Last stage (Offer) should show N/A for rate
    const naTexts = screen.getAllByText("N/A");
    expect(naTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("should display period label in date range picker", async () => {
    renderAnalytics();

    expect(await screen.findByText("Period:")).toBeInTheDocument();
  });

  it("should show conversion percentage in funnel drop-off", async () => {
    renderAnalytics();

    // Applied 10 → Phone Screen 7: 70% conversion rate
    const dropoff = await screen.findByText(/70% → next stage/);
    expect(dropoff).toBeInTheDocument();
  });

  it("should display reply rate tooltip on hover", async () => {
    const user = userEvent.setup();
    renderAnalytics();

    await screen.findByText("Reply rate");

    // Find the info icon near Reply rate
    const infoParts = screen.getAllByText("Reply rate");
    const replyRateTile = infoParts[0].closest("div");
    const infoIcon = replyRateTile.querySelector("svg");

    expect(infoIcon).toBeInTheDocument();

    // Hover and check tooltip appears
    await user.hover(infoIcon);

    // Tooltip should contain explanation
    expect(
      await screen.findByText(/Applications with any company response/, { exact: false })
    ).toBeInTheDocument();
  });

  it("should hide avg response delta when not available", async () => {
    renderAnalytics();

    await screen.findByText("Avg response");

    // avg response delta should not show if not computed
    const avgResponseTile = screen.getByText("4.2 days").closest("div");
    expect(avgResponseTile).not.toHaveTextContent("vs last period");
  });
});
