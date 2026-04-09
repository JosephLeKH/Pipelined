/** Tests for the Activity page timeline. */

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
    type: "applied",
    timestamp: new Date(Date.now() - 86_400_000).toISOString(),
    application_id: "app1",
    company: "Acme",
    role_title: "Engineer",
    details: {},
  },
  {
    type: "stage_change",
    timestamp: new Date(Date.now() - 172_800_000).toISOString(),
    application_id: "app2",
    company: "Beta",
    role_title: "PM",
    details: { from_stage: "Applied", to_stage: "Interview" },
  },
  {
    type: "event_created",
    timestamp: new Date(Date.now() - 259_200_000).toISOString(),
    application_id: "app3",
    company: "Gamma",
    role_title: "SWE",
    details: { event_type: "phone_screen" },
  },
];

const server = setupServer(
  http.get("/api/activity", () =>
    HttpResponse.json({ data: MOCK_ENTRIES, meta: { total: 3, days: 30 } })
  ),
  http.get("/api/notifications/unread-count", () =>
    HttpResponse.json({ data: { count: 0 } })
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
    })
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Captures the current route for navigation assertions. */
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
              </Routes>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  };
}

describe("ActivityPage", () => {
  it("should render the Activity heading", async () => {
    render(<ActivityPage />, { wrapper: makeWrapper() });

    expect(await screen.findByRole("heading", { name: /activity/i })).toBeDefined();
  });

  it("should render timeline entries from the feed", async () => {
    render(<ActivityPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText(/Applied to Engineer at Acme/)).toBeDefined();
    expect(await screen.findByText(/Moved Beta PM from Applied to Interview/)).toBeDefined();
    expect(await screen.findByText(/Scheduled phone_screen for Gamma/)).toBeDefined();
  });

  it("should show total count", async () => {
    render(<ActivityPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText("3 actions")).toBeDefined();
  });

  it("should render time range selector buttons", async () => {
    render(<ActivityPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText("Last 7 days")).toBeDefined();
    expect(screen.getByText("Last 30 days")).toBeDefined();
    expect(screen.getByText("Last 90 days")).toBeDefined();
    expect(screen.getByText("All time")).toBeDefined();
  });

  it("should show empty state when no entries", async () => {
    server.use(
      http.get("/api/activity", () =>
        HttpResponse.json({ data: [], meta: { total: 0, days: 30 } })
      ),
    );

    render(<ActivityPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText("No activity yet")).toBeDefined();
  });

  it("should navigate to dashboard on entry click", async () => {
    capturedLocation = null;

    render(<ActivityPage />, { wrapper: makeWrapper() });

    const entry = await screen.findByText(/Applied to Engineer at Acme/);
    fireEvent.click(entry);

    expect(capturedLocation).toBe("/dashboard?selected=app1");
  });
});
