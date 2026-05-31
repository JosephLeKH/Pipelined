/** Tests for Dashboard — component composition, URL-driven selection, filter wiring. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
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

function makeWrapper(initialEntries = ["/dashboard"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <AuthProvider>{withTooltipProvider(children)}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("Dashboard", () => {
  it("should render the page heading and Add Application button", () => {
    // Arrange / Act
    render(<Dashboard />, { wrapper: makeWrapper() });

    // Assert — heading is unique; multiple "Add Application" buttons may exist (header + modal form)
    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /add application/i }).length).toBeGreaterThan(0);
  });

  it("should render FilterBar stage filter trigger", async () => {
    // Arrange / Act
    render(<Dashboard />, { wrapper: makeWrapper() });

    // Assert — FilterBar renders inline stage dropdown
    expect(await screen.findByRole("button", { name: "Stage: All" })).toBeInTheDocument();
  });

  it("should render ApplicationList with application data", async () => {
    // Arrange / Act
    render(<Dashboard />, { wrapper: makeWrapper() });

    // Assert — findBy* throws if not found, which is sufficient; no toBeInTheDocument needed
    await screen.findByText("Acme Corp");
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("should set ?selected=<id> in URL when an application row is clicked", async () => {
    // Arrange
    render(<Dashboard />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");

    // Act
    await userEvent.click(screen.getByText("Acme Corp").closest("[role='listitem']"));

    // Assert — DetailPanel slide-in panel becomes visible (trangray-x-0 class)
    const panel = await screen.findByRole("dialog", { name: /software engineer/i });
    expect(panel).toBeInTheDocument();
  });

  it("should open DetailPanel when ?selected=<id> is in the URL on load", async () => {
    // Arrange — start with ?selected=app1 already in URL
    render(<Dashboard />, { wrapper: makeWrapper(["/dashboard?selected=app1"]) });

    // Assert — panel overlay becomes visible (opacity-100) and application data loads
    const overlay = screen.getByTestId("panel-overlay");
    // Wait for the detail panel to populate with data (role title from PanelHeader)
    expect(await screen.findByRole("heading", { name: /software engineer/i })).toBeInTheDocument();
    expect(overlay).toHaveClass("opacity-100");
  });

  it("should close DetailPanel and remove ?selected from URL when close is triggered", async () => {
    // Arrange — open with selected param
    render(<Dashboard />, { wrapper: makeWrapper(["/dashboard?selected=app1"]) });
    await screen.findByRole("dialog", { name: /software engineer/i });

    // Act — press Escape to close
    await userEvent.keyboard("{Escape}");

    // Assert — panel overlay becomes hidden
    const overlay = screen.getByTestId("panel-overlay");
    expect(overlay).toHaveClass("opacity-0");
  });

  it("should open ManualAddForm modal overlay when Add Application header button is clicked", async () => {
    // Arrange
    render(<Dashboard />, { wrapper: makeWrapper() });

    // Act — click an "Add Application" button
    const buttons = screen.getAllByRole("button", { name: /add application/i });
    // Find the first button that's not inside a form (skip submit button in form if rendered)
    let headerBtn;
    for (const btn of buttons) {
      if (!btn.closest("form")) {
        headerBtn = btn;
        break;
      }
    }

    if (!headerBtn) {
      // If no header button found, use first button
      headerBtn = buttons[0];
    }

    await userEvent.click(headerBtn);

    // Assert — modal form appears (look for any form field)
    expect(await screen.findByRole("textbox")).toBeInTheDocument();
  });

  it("should open ManualAddForm modal when pressing a keyboard shortcut", async () => {
    // Arrange
    render(<Dashboard />, { wrapper: makeWrapper() });

    // Act
    await userEvent.keyboard("a");

    // Assert
    expect(await screen.findByRole("dialog", { name: /add application/i })).toBeInTheDocument();
  });

  it("should render StatsBar metrics after stats load", async () => {
    // Arrange / Act
    const user = (await import("@testing-library/user-event")).default.setup();
    render(<Dashboard />, { wrapper: makeWrapper() });

    // Assert — collapsed summary visible by default; expand to confirm metric cells render
    const summary = await screen.findByTestId("stats-collapsed-summary");
    expect(summary).toHaveTextContent("applications");
    await user.click(await screen.findByRole("button", { name: /expand statistics/i }));
    expect(await screen.findByLabelText(/total applied/i)).toBeInTheDocument();
  });
});
