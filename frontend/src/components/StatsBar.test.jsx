/** Tests for StatsBar — verifies metric rendering and skeleton loading state. */

import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import StatsBar from "./StatsBar";

const STATS = {
  total_applied: 42,
  active_count: 30,
  response_rate: 0.25,
  avg_days_to_first_response: 5.3,
  stale_count: 7,
};

const server = setupServer(
  http.get("/api/applications/stats", () => HttpResponse.json({ data: STATS }))
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

  it("should render 4 metric cards with correct values", async () => {
    // Arrange / Act
    render(<StatsBar />, { wrapper: makeWrapper() });

    // Assert
    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(screen.getByText("5.3")).toBeInTheDocument();
  });

  it("should display — for avg_days_to_first_response when null", async () => {
    // Arrange
    server.use(
      http.get("/api/applications/stats", () =>
        HttpResponse.json({ data: { ...STATS, avg_days_to_first_response: null } })
      )
    );

    // Act
    render(<StatsBar />, { wrapper: makeWrapper() });

    // Assert — total_applied loads and avg days shows dash
    expect(await screen.findByText("42")).toBeInTheDocument();
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("should render metric cards with aria-label describing each metric", async () => {
    // Arrange / Act
    render(<StatsBar />, { wrapper: makeWrapper() });
    await screen.findByText("42");

    // Assert — each card has an accessible aria-label
    expect(screen.getByLabelText(/total applied/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/response rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/avg days to response/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/needs follow-up/i)).toBeInTheDocument();
  });

  it("should render needs follow-up count from stale_count", async () => {
    // Arrange / Act
    render(<StatsBar />, { wrapper: makeWrapper() });

    // Assert
    expect(await screen.findByText("7")).toBeInTheDocument();
    expect(screen.getByLabelText(/needs follow-up: 7/i)).toBeInTheDocument();
  });
});
