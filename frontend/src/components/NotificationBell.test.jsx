/** Tests for NotificationBell dropdown notification panel. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import NotificationBell from "./NotificationBell";
import { passthroughHandlers } from "../test/passthroughHandlers";

const MOCK_NOTIFICATIONS = [
  {
    id: "notif1",
    type: "stale_app",
    title: "No update: Acme",
    body: "Your application at Acme hasn't been updated in 14+ days.",
    action_url: "/dashboard?selected=app1&action=follow-up",
    read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "notif2",
    type: "interview_tomorrow",
    title: "Interview tomorrow: Beta",
    body: "You have an interview with Beta tomorrow.",
    action_url: "/calendar",
    read: true,
    created_at: new Date().toISOString(),
  },
];

const server = setupServer(
  http.get("/api/notifications/unread-count", () =>
    HttpResponse.json({ data: { count: 1 } })
  ),
  http.get("/api/notifications", () =>
    HttpResponse.json({ data: MOCK_NOTIFICATIONS })
  ),
  http.patch("/api/notifications/read-all", () =>
    HttpResponse.json({ data: { marked: 1 } })
  ),
  http.patch("/api/notifications/notif1/read", () =>
    HttpResponse.json({ data: { ok: true } })
  ),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper(initialPath = "/dashboard") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

let capturedPath = "";
let capturedSearch = "";
function LocationCapture() {
  const location = useLocation();
  capturedPath = location.pathname;
  capturedSearch = location.search;
  return null;
}

describe("NotificationBell", () => {
  it("should render bell button", async () => {
    render(<NotificationBell />, { wrapper: makeWrapper() });

    const button = screen.getByRole("button", { name: /notifications/i });
    expect(button).toBeDefined();
  });

  it("should show unread badge when unread count > 0", async () => {
    render(<NotificationBell />, { wrapper: makeWrapper() });

    const badge = await screen.findByText("1");
    expect(badge).toBeDefined();
  });

  it("should open panel on bell click", async () => {
    render(<NotificationBell />, { wrapper: makeWrapper() });

    const button = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(button);

    const panel = await screen.findByTestId("notification-panel");
    expect(panel).toBeDefined();
  });

  it("should list notifications in open panel", async () => {
    render(<NotificationBell />, { wrapper: makeWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    expect(await screen.findByText("No update: Acme")).toBeDefined();
    expect(await screen.findByText("Interview tomorrow: Beta")).toBeDefined();
  });

  it("should show mark all read button when unread count > 0", async () => {
    render(<NotificationBell />, { wrapper: makeWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    expect(await screen.findByText("Mark all read")).toBeDefined();
  });

  it("should close panel when clicking outside", async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <NotificationBell />
      </div>,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    await screen.findByTestId("notification-panel");

    fireEvent.mouseDown(screen.getByTestId("outside"));
    await waitFor(() =>
      expect(screen.queryByTestId("notification-panel")).toBeNull()
    );
  });

  it("should show empty state when no notifications", async () => {
    server.use(
      http.get("/api/notifications", () => HttpResponse.json({ data: [] })),
      http.get("/api/notifications/unread-count", () =>
        HttpResponse.json({ data: { count: 0 } })
      ),
    );

    render(<NotificationBell />, { wrapper: makeWrapper() });

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    expect(await screen.findByText("No notifications")).toBeDefined();
  });

  it("should navigate to /today when morning_brief_ready notification is clicked", async () => {
    server.use(
      http.get("/api/notifications", () =>
        HttpResponse.json({
          data: [{
            id: "brief1",
            type: "morning_brief_ready",
            title: "Your morning brief is ready",
            body: "1 follow-up, 1 interview",
            action_url: "/today",
            read: false,
            created_at: new Date().toISOString(),
          }],
        })
      ),
      http.get("/api/notifications/unread-count", () =>
        HttpResponse.json({ data: { count: 1 } })
      ),
      http.patch("/api/notifications/brief1/read", () =>
        HttpResponse.json({ data: { ok: true } })
      ),
    );

    render(
      <Routes>
        <Route path="*" element={<><LocationCapture /><NotificationBell /></>} />
      </Routes>,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    fireEvent.click(await screen.findByText("Your morning brief is ready"));

    await waitFor(() => expect(capturedPath).toBe("/today"));
  });

  it("should navigate to follow-up section for follow_up_due notification", async () => {
    server.use(
      http.get("/api/notifications", () =>
        HttpResponse.json({
          data: [{
            id: "follow1",
            type: "follow_up_due",
            title: "Follow-up overdue: Acme",
            body: "Your follow-up is overdue.",
            action_url: "/dashboard?selected=app1&action=follow-up",
            read: false,
            created_at: new Date().toISOString(),
          }],
        })
      ),
      http.get("/api/notifications/unread-count", () =>
        HttpResponse.json({ data: { count: 1 } })
      ),
      http.patch("/api/notifications/follow1/read", () =>
        HttpResponse.json({ data: { ok: true } })
      ),
    );

    capturedPath = "";
    capturedSearch = "";
    render(
      <Routes>
        <Route path="*" element={<><LocationCapture /><NotificationBell /></>} />
      </Routes>,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    fireEvent.click(await screen.findByText("Follow-up overdue: Acme"));

    await waitFor(() => {
      expect(capturedPath).toBe("/dashboard");
      expect(capturedSearch).toContain("action=follow-up");
    });
  });
  it("should navigate to application when interview_prep_ready notification is clicked", async () => {
    server.use(
      http.get("/api/notifications", () =>
        HttpResponse.json({
          data: [{
            id: "prep1",
            type: "interview_prep_ready",
            title: "Interview prep ready: Acme",
            body: "Your briefing is ready.",
            action_url: "/dashboard?selected=app99",
            read: false,
            created_at: new Date().toISOString(),
          }],
        })
      ),
      http.get("/api/notifications/unread-count", () =>
        HttpResponse.json({ data: { count: 1 } })
      ),
      http.patch("/api/notifications/prep1/read", () =>
        HttpResponse.json({ data: { ok: true } })
      ),
    );

    capturedPath = "";
    capturedSearch = "";
    render(
      <Routes>
        <Route path="*" element={<><LocationCapture /><NotificationBell /></>} />
      </Routes>,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    fireEvent.click(await screen.findByText("Interview prep ready: Acme"));

    await waitFor(() => {
      expect(capturedPath).toBe("/dashboard");
      expect(capturedSearch).toContain("selected=app99");
    });
  });

});
