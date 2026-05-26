/** Tests for StatsBar — verifies metric rendering and skeleton loading state. */

import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import StatsBar from "./StatsBar";
import { passthroughHandlers } from "../test/passthroughHandlers";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { weekly_goal: 5 } }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const STATS = {
  total_applied: 42,
  active_count: 30,
  response_rate: 0.25,
  avg_days_to_first_response: 5.3,
  stale_count: 7,
  applied_this_week: 2,
  current_streak: 0,
};

const server = setupServer(
  http.get("/api/applications/stats", () => HttpResponse.json({ data: STATS })),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("StatsBar", () => {
  it("should show skeleton cards while data is loading", () => {
    // Arrange — suspend response so loading state persists
    server.use(http.get("/api/applications/stats", () => new Promise(() => {})));

    // Act
    render(<StatsBar />, { wrapper: makeWrapper() });

    // Assert — skeleton elements are present
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render 4 metric cards with correct values when expanded", async () => {
    // Arrange / Act
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<StatsBar />, { wrapper: makeWrapper() });

    // Assert — collapsed summary visible by default with applications
    const summary = await screen.findByTestId("stats-collapsed-summary");
    expect(summary).toHaveTextContent("42 applications");
    expect(summary).toHaveTextContent("30 active");

    // Expand to verify metric grid
    await user.click(screen.getByRole("button", { name: /expand statistics/i }));
    expect(await screen.findByLabelText(/response rate: 25.0%/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/avg days to response: 5.3/i)).toBeInTheDocument();
  });

  it("should display N/A for avg_days_to_first_response when null", async () => {
    // Arrange
    server.use(
      http.get("/api/applications/stats", () =>
        HttpResponse.json({ data: { ...STATS, avg_days_to_first_response: null } })
      )
    );
    const user = (await import("@testing-library/user-event")).default.setup();

    // Act
    render(<StatsBar />, { wrapper: makeWrapper() });
    await screen.findByText("42");
    await user.click(screen.getByRole("button", { name: /expand statistics/i }));

    // Assert — avg days shows N/A in expanded grid
    const naTexts = await screen.findAllByText("N/A");
    expect(naTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("should render metric cards with aria-label describing each metric", async () => {
    // Arrange / Act
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<StatsBar />, { wrapper: makeWrapper() });
    await screen.findByText("42");
    await user.click(screen.getByRole("button", { name: /expand statistics/i }));

    // Assert — each card has an accessible aria-label
    expect(await screen.findByLabelText(/total applied/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^active: 30$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/response rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/avg days to response/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stale applications/i)).toBeInTheDocument();
  });

  it("should render stale applications count from stale_count", async () => {
    // Arrange / Act
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<StatsBar />, { wrapper: makeWrapper() });
    await screen.findByText("42");
    await user.click(screen.getByRole("button", { name: /expand statistics/i }));

    // Assert
    expect(await screen.findByLabelText(/stale applications: 7/i)).toBeInTheDocument();
  });

  it("should auto-expand metric grid when user has no applications", async () => {
    // Arrange — empty state
    server.use(
      http.get("/api/applications/stats", () =>
        HttpResponse.json({
          data: { ...STATS, total_applied: 0, active_count: 0, stale_count: 0 },
        })
      )
    );

    // Act
    render(<StatsBar />, { wrapper: makeWrapper() });

    // Assert — grid is open by default for new users
    expect(await screen.findByLabelText(/total applied: 0/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /collapse statistics/i })).toBeInTheDocument();
  });

  it("should show collapsed summary line with expand caret by default when filters active", async () => {
    render(<StatsBar filtersActive />, { wrapper: makeWrapper() });

    expect(await screen.findByText(/42/)).toBeInTheDocument();
    expect(screen.getByText(/applications/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand statistics/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/response rate/i)).not.toBeInTheDocument();
  });

  it("should expand metric grid when caret is clicked", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<StatsBar filtersActive />, { wrapper: makeWrapper() });

    await screen.findByText(/42/);
    await user.click(screen.getByRole("button", { name: /expand statistics/i }));

    expect(await screen.findByLabelText(/response rate/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /collapse statistics/i })).toBeInTheDocument();
  });

  it("should show compact goal progress in summary row", async () => {
    server.use(
      http.get("/api/applications/stats", () =>
        HttpResponse.json({ data: { ...STATS, applied_this_week: 3, current_streak: 0 } })
      )
    );

    render(<StatsBar />, { wrapper: makeWrapper() });

    expect(await screen.findByText(/goal:/i)).toBeInTheDocument();
    expect(await screen.findByText(/3\/5 this week/i)).toBeInTheDocument();
  });
});
