/** Tests for TodayPage mission rows and actions. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import TodayPage from "./TodayPage";
import { passthroughHandlers } from "../test/passthroughHandlers";

const MOCK_BRIEF = {
  date: "2026-05-23",
  summary_line: "1 follow-up",
  sections: {
    follow_ups: [{
      title: "Beta Corp — follow-up",
      body: "Overdue by 2 days",
      action_url: "/dashboard?selected=app2",
    }],
    interviews: [],
    high_matches: [],
    pending_approvals: [],
  },
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
        display_name: "Test User",
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
  vi.useRealTimers();
  localStorage.clear();
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
  it("should render greeting with mission row", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-23T09:00:00"));

    render(<TodayPage />, { wrapper: makeWrapper() });

    expect(await screen.findByRole("heading", { level: 1, name: /Good morning, Test\./i })).toBeInTheDocument();
    expect(screen.getByText("0 / 5 applications this week")).toBeInTheDocument();
    expect(screen.getByText("Acme — follow-up overdue")).toBeInTheDocument();
    expect(screen.getByText("Follow-up is overdue — respond today")).toBeInTheDocument();
    expect(screen.getByText("Saturday, May 23 · 1 mission")).toBeInTheDocument();
  });

  it("should call snooze API when Snooze is clicked", async () => {
    const user = userEvent.setup();
    render(<TodayPage />, { wrapper: makeWrapper() });

    await screen.findByRole("heading", { level: 1 });
    const snoozeButton = await screen.findByRole("button", { name: /snooze/i });
    await user.click(snoozeButton);

    await waitFor(() => expect(snoozeCalled).toBe(true));
  });

  it("should call done API when Complete is clicked", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TodayPage />, { wrapper: makeWrapper() });

    await screen.findByRole("heading", { level: 1 });
    const completeButton = await screen.findByRole("button", { name: /complete/i });
    await user.click(completeButton);

    await vi.advanceTimersByTimeAsync(300);
    await waitFor(() => expect(doneCalled).toBe(true));
  });

  it("should move completed mission into collapsed group", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TodayPage />, { wrapper: makeWrapper() });

    await screen.findByRole("heading", { level: 1 });
    await user.click(await screen.findByRole("button", { name: /complete/i }));
    await vi.advanceTimersByTimeAsync(300);

    expect(await screen.findByRole("button", { name: /completed \(1\)/i })).toBeInTheDocument();
    expect(screen.queryByText("Acme — follow-up overdue")).not.toBeInTheDocument();
  });

  it("should show mission progress strip", async () => {
    render(<TodayPage />, { wrapper: makeWrapper() });

    expect(await screen.findByLabelText("0 of 1 missions cleared today")).toBeInTheDocument();
  });

  it("should show empty state when there are no missions", async () => {
    server.use(
      http.get("/api/brief/today", () =>
        HttpResponse.json({
          data: {
            ...MOCK_BRIEF,
            missions: [],
            mission_progress: { cleared: 0, total: 0 },
          },
        })
      )
    );

    render(<TodayPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText("You're caught up.")).toBeInTheDocument();
    expect(screen.getByText(/No missions ranked for today/i)).toBeInTheDocument();
  });

  it("should show collapsible morning brief section", async () => {
    render(<TodayPage />, { wrapper: makeWrapper() });

    expect(await screen.findByRole("button", { name: /tap to read your morning brief/i }))
      .toBeInTheDocument();
    expect(screen.getByText(/Morning brief · 9am/i)).toBeInTheDocument();
  });

  it("should expand morning brief when tapped", async () => {
    const user = userEvent.setup();
    render(<TodayPage />, { wrapper: makeWrapper() });

    await user.click(await screen.findByRole("button", { name: /tap to read your morning brief/i }));

    expect(await screen.findByText("Beta Corp — follow-up")).toBeInTheDocument();
    expect(screen.getByText("1 follow-up")).toBeInTheDocument();
  });

  it("should auto-expand morning brief when brief=open query param is set", async () => {
    function BriefOpenWrapper({ children }) {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <ThemeProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <MemoryRouter initialEntries={["/today?brief=open"]}>{children}</MemoryRouter>
            </QueryClientProvider>
          </AuthProvider>
        </ThemeProvider>
      );
    }

    render(<TodayPage />, { wrapper: BriefOpenWrapper });

    expect(await screen.findByText("Beta Corp — follow-up")).toBeInTheDocument();
  });
});
