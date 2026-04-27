/** Tests for the Calendar page. */

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import Calendar from "./Calendar";

const MOCK_EVENT = {
  id: "evt1",
  application_id: "app1",
  event_type: "phone_screen",
  title: "Phone Screen",
  date: new Date().toISOString().split("T")[0],
  time: "10:00",
  notes: "",
  user_id: "user1",
};

const MOCK_ME = {
  id: "user1",
  email: "test@test.com",
  display_name: "Test",
  has_resume: false,
  weekly_goal: 5,
  default_stages: [],
  email_verified: true,
};

const server = setupServer(
  http.get("/api/calendar/events", () =>
    HttpResponse.json({ data: [MOCK_EVENT] })
  ),
  http.get("/api/auth/me", () =>
    HttpResponse.json({ data: MOCK_ME })
  ),
  http.get("/api/notifications/unread-count", () =>
    HttpResponse.json({ data: { count: 0 } })
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={["/calendar"]}>{children}</MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    );
  };
}

describe("Calendar page", () => {
  it("should render the Calendar heading", async () => {
    const Wrapper = makeWrapper();

    render(<Calendar />, { wrapper: Wrapper });

    await waitFor(
      () => {
        expect(screen.getByRole("heading", { name: "Calendar", level: 1 })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should render the CalendarGrid with navigation buttons", async () => {
    const Wrapper = makeWrapper();

    render(<Calendar />, { wrapper: Wrapper });

    await waitFor(() => {
      const prevButtons = screen.getAllByRole("button");
      expect(prevButtons.length).toBeGreaterThan(0);
    });
  });

  it("should show empty state when no events are loaded", async () => {
    server.use(
      http.get("/api/calendar/events", () =>
        HttpResponse.json({ data: [] })
      )
    );
    const Wrapper = makeWrapper();

    render(<Calendar />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/no interviews scheduled/i)).toBeInTheDocument();
    });
  });

  it("should not show empty state when events are present", async () => {
    const Wrapper = makeWrapper();

    render(<Calendar />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.queryByText(/no interviews scheduled/i)).not.toBeInTheDocument();
    });
  });
});
