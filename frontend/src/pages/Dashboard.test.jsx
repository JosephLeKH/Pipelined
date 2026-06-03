/** Tests for Dashboard — composition, filters, navigation to detail page, add-form modal. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useParams } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import Dashboard from "./Dashboard";
import { withTooltipProvider } from "../test/testProviders";
import { passthroughHandlers } from "../test/passthroughHandlers";

const APP = {
  id: "app1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Applied",
  date_applied: "2026-01-15T00:00:00Z",
  updated_at: "2026-03-20T00:00:00Z",
  source: "manual",
  stage_history: [{ stage: "Applied", transitioned_at: "2026-01-15T00:00:00Z" }],
  stages: ["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"],
};

const STATS = {
  total_applied: 5,
  active_count: 3,
  response_rate: 0.4,
  avg_days_to_first_response: 7.2,
};

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({ data: { id: "u1", email: "test@example.com", display_name: "Test" } })
  ),
  http.get("/api/applications", () =>
    HttpResponse.json({ data: [APP], meta: { count: 1, next_cursor: null } })
  ),
  http.get("/api/applications/stats", () =>
    HttpResponse.json({ data: STATS })
  ),
  http.get("/api/applications/:id", () =>
    HttpResponse.json({ data: APP })
  ),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function AppDetailMarker() {
  const { id } = useParams();
  return <div data-testid="app-detail-marker">App detail: {id}</div>;
}

function makeWrapper(initialEntries = ["/dashboard"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <AuthProvider>
            {withTooltipProvider(
              <Routes>
                <Route path="/dashboard" element={children} />
                <Route path="/applications/:id" element={<AppDetailMarker />} />
              </Routes>
            )}
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("Dashboard", () => {
  it("should render the page heading and Add Application button", () => {
    render(<Dashboard />, { wrapper: makeWrapper() });

    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /add application/i }).length).toBeGreaterThan(0);
  });

  it("should render FilterBar stage filter trigger", async () => {
    render(<Dashboard />, { wrapper: makeWrapper() });

    expect(await screen.findByRole("button", { name: "Stage: All" })).toBeInTheDocument();
  });

  it("should render ApplicationList with application data", async () => {
    render(<Dashboard />, { wrapper: makeWrapper() });

    await screen.findByText("Acme Corp");
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("should navigate to /applications/<id> when an application row is clicked", async () => {
    render(<Dashboard />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");

    await userEvent.click(screen.getByText("Acme Corp").closest("[role='listitem']"));

    expect(await screen.findByTestId("app-detail-marker")).toHaveTextContent("app1");
  });

  it("should open ManualAddForm modal overlay when Add Application header button is clicked", async () => {
    render(<Dashboard />, { wrapper: makeWrapper() });

    const buttons = screen.getAllByRole("button", { name: /add application/i });
    let headerBtn;
    for (const btn of buttons) {
      if (!btn.closest("form")) {
        headerBtn = btn;
        break;
      }
    }
    if (!headerBtn) headerBtn = buttons[0];

    await userEvent.click(headerBtn);

    expect(await screen.findByRole("textbox")).toBeInTheDocument();
  });

  it("should open ManualAddForm modal when pressing a keyboard shortcut", async () => {
    render(<Dashboard />, { wrapper: makeWrapper() });

    await userEvent.keyboard("a");

    expect(await screen.findByRole("dialog", { name: /add application/i })).toBeInTheDocument();
  });

  it("should render StatsBar metrics after stats load", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<Dashboard />, { wrapper: makeWrapper() });

    const summary = await screen.findByTestId("stats-collapsed-summary");
    expect(summary).toHaveTextContent("applications");
    await user.click(await screen.findByRole("button", { name: /expand statistics/i }));
    expect(await screen.findByLabelText(/total applied/i)).toBeInTheDocument();
  });
});
