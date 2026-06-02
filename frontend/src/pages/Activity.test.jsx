/** Tests for the Activity page agent feed. */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import ActivityPage from "./Activity";

const MOCK_ENTRIES = [
  {
    id: "run1",
    agent_type: "autopilot",
    status: "success",
    summary: "Autopilot scanned 1,284 jobs · matched 3",
    created_at: new Date().toISOString(),
    application_id: null,
  },
  {
    id: "run2",
    agent_type: "brief",
    status: "success",
    summary: "Morning brief sent",
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    application_id: null,
  },
  {
    id: "run3",
    agent_type: "classify",
    status: "success",
    summary: "Gmail sync: 12 new emails classified",
    created_at: new Date(Date.now() - 172_800_000).toISOString(),
    application_id: "app1",
  },
];

const server = setupServer(
  http.get("/api/agent/activity", () =>
    HttpResponse.json({ data: MOCK_ENTRIES, meta: { limit: 50 } }),
  ),
  http.get("/api/notifications/unread-count", () =>
    HttpResponse.json({ data: { count: 0 } }),
  ),
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "user1",
        email: "test@test.com",
        name: "Test",
        has_resume: false,
        weekly_goal: 5,
        default_stages: [],
      },
    }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let capturedLocation = null;
function LocationCapture() {
  const location = useLocation();
  capturedLocation = location.pathname + location.search;
  return null;
}

function makeWrapper(initialPath = "/activity") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialPath]}>
            <AuthProvider>
              <Routes>
                <Route path="/activity" element={children} />
                <Route path="/dashboard" element={<LocationCapture />} />
                <Route path="/inbox/pending" element={<LocationCapture />} />
              </Routes>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  };
}

describe("ActivityPage", () => {
  it("should render the Scout's Activity heading", async () => {
    render(<ActivityPage />, { wrapper: makeWrapper() });

    expect(await screen.findByRole("heading", { name: /scout's activity/i })).toBeDefined();
  });

  it("should render agent activity rows with summary and timestamp", async () => {
    render(<ActivityPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText("Autopilot scanned 1,284 jobs · matched 3")).toBeDefined();
    expect(screen.getByText("Morning brief sent")).toBeDefined();
    expect(screen.getByText("Gmail sync: 12 new emails classified")).toBeDefined();
    expect(screen.getAllByRole("time")).toHaveLength(3);
  });

  it("should show subheading", async () => {
    render(<ActivityPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText("Everything Scout has done for you, newest first.")).toBeDefined();
  });

  it("should group entries under date headings", async () => {
    render(<ActivityPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText("Today")).toBeDefined();
    expect(screen.getByText("Yesterday")).toBeDefined();
  });

  it("should render filter chips with All selected by default", async () => {
    render(<ActivityPage />, { wrapper: makeWrapper() });

    await screen.findByText("All");
    expect(screen.getByRole("tab", { name: "All", selected: true })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Scored", selected: false })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Drafted", selected: false })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Found", selected: false })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Flagged", selected: false })).toBeDefined();
  });

  it("should update aria-selected when filter chip is clicked", async () => {
    render(<ActivityPage />, { wrapper: makeWrapper() });

    const allChip = await screen.findByRole("tab", { name: "All" });
    const scoredChip = screen.getByRole("tab", { name: "Scored" });

    expect(allChip).toHaveAttribute("aria-selected", "true");
    expect(scoredChip).toHaveAttribute("aria-selected", "false");

    fireEvent.click(scoredChip);

    expect(allChip).toHaveAttribute("aria-selected", "false");
    expect(scoredChip).toHaveAttribute("aria-selected", "true");
  });

  it("should show empty state when no entries", async () => {
    server.use(
      http.get("/api/agent/activity", () =>
        HttpResponse.json({ data: [], meta: { limit: 50 } }),
      ),
    );

    render(<ActivityPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText("No activity yet")).toBeDefined();
  });

  it("should show error state when agent activity fails", async () => {
    server.use(http.get("/api/agent/activity", () => HttpResponse.error()));

    render(<ActivityPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText("Failed to load activity.")).toBeDefined();
    expect(screen.getByRole("button", { name: /retry loading activity/i })).toBeDefined();
  });

  it("should navigate to dashboard when entry has application_id", async () => {
    capturedLocation = null;

    render(<ActivityPage />, { wrapper: makeWrapper() });

    const entry = await screen.findByText("Gmail sync: 12 new emails classified");
    fireEvent.click(entry);

    expect(capturedLocation).toBe("/dashboard?selected=app1");
  });

  it("should navigate to pending inbox for autopilot entry", async () => {
    capturedLocation = null;

    render(<ActivityPage />, { wrapper: makeWrapper() });

    const entry = await screen.findByText("Autopilot scanned 1,284 jobs · matched 3");
    fireEvent.click(entry);

    expect(capturedLocation).toBe("/inbox/pending");
  });
});
