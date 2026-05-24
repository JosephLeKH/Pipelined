/** Tests for TodayPage mission cards and actions. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import TodayPage from "./TodayPage";
import { passthroughHandlers } from "../test/passthroughHandlers";

const MOCK_BRIEF = {
  date: "2026-05-23",
  summary_line: "1 follow-up",
  sections: { follow_ups: [], interviews: [], high_matches: [], pending_approvals: [] },
  missions: [{
    id: "follow_ups:0",
    section: "follow_ups",
    title: "Acme — follow-up overdue",
    body: "Generate a draft on demand in the detail panel",
    action_url: "/dashboard?selected=app1&action=follow-up",
    priority: 1,
    reason: "Follow-up is overdue — respond today",
    prep_ready: false,
  }],
  mission_progress: { cleared: 0, total: 1 },
};

let snoozeCalled = false;
let doneCalled = false;

const server = setupServer(
  http.get("/api/brief/today", () => HttpResponse.json({ data: MOCK_BRIEF })),
  http.get("/api/brief/history", () => HttpResponse.json({ data: [], meta: { days: 7 } })),
  http.post("/api/brief/missions/:id/snooze", () => {
    snoozeCalled = true;
    return HttpResponse.json({ data: { snoozed: { "follow_ups:0": "2026-05-24T00:00:00Z" } } });
  }),
  http.post("/api/brief/missions/:id/done", () => {
    doneCalled = true;
    return HttpResponse.json({ data: { completed: ["follow_ups:0"] } });
  }),
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "user1",
        email: "test@test.com",
        display_name: "Test",
        has_resume: false,
        weekly_goal: 5,
        default_stages: [],
        morning_brief_hour: 9,
      },
    })
  ),
  http.post("/api/auth/refresh", () => HttpResponse.json({ data: { ok: true } })),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  snoozeCalled = false;
  doneCalled = false;
});
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return (
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  };
}

describe("TodayPage", () => {
  it("should render hero with top mission and reason", async () => {
    render(<TodayPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText("Top priority")).toBeInTheDocument();
    expect(screen.getAllByText("Acme — follow-up overdue").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Follow-up is overdue — respond today").length).toBeGreaterThan(0);
  });

  it("should call snooze API when Snooze is clicked", async () => {
    const user = userEvent.setup();
    render(<TodayPage />, { wrapper: makeWrapper() });

    await screen.findByRole("heading", { level: 1, name: "Today" });
    const snoozeButtons = await screen.findAllByRole("button", { name: /snooze/i });
    await user.click(snoozeButtons[0]);

    await waitFor(() => expect(snoozeCalled).toBe(true));
  });

  it("should call done API when Done is clicked", async () => {
    const user = userEvent.setup();
    render(<TodayPage />, { wrapper: makeWrapper() });

    await screen.findByRole("heading", { level: 1, name: "Today" });
    const doneButtons = await screen.findAllByRole("button", { name: /done/i });
    await user.click(doneButtons[0]);

    await waitFor(() => expect(doneCalled).toBe(true));
  });

  it("should show mission progress strip", async () => {
    render(<TodayPage />, { wrapper: makeWrapper() });

    expect(await screen.findByLabelText("0 of 1 missions cleared today")).toBeInTheDocument();
  });
});
