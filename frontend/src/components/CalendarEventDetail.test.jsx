/** Tests for CalendarEventDetail — 480px drawer, prep checklist, application link. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import CalendarEventDetail from "./CalendarEventDetail";
import { passthroughHandlers } from "../test/passthroughHandlers";
import {
  CALENDAR_EVENT_DRAWER_WIDTH_PX,
  CALENDAR_EVENT_PREP_ITEMS,
  DRAWER_ANIMATION_MS,
} from "../lib/constants";

const PATCH_HANDLER = vi.fn();

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "user1",
        email: "test@example.com",
        display_name: "Test User",
        default_stages: ["Applied", "Rejected"],
        timezone: "America/New_York",
      },
    })
  ),
  http.patch("/api/calendar/events/:id", async ({ request }) => {
    const body = await request.json();
    PATCH_HANDLER(body);
    return HttpResponse.json({
      data: {
        id: "ev1",
        application_id: "app1",
        event_type: "technical",
        date: "2026-03-15",
        time: "10:00:00",
        title: "Technical Interview",
        company: "Acme Corp",
        role_title: "Software Engineer",
        prep_checklist: body.prep_checklist ?? [],
      },
    });
  }),
  ...passthroughHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  PATCH_HANDLER.mockClear();
});
afterAll(() => server.close());

const BASE_EVENT = {
  id: "ev1",
  application_id: "app1",
  event_type: "technical",
  date: "2026-03-15",
  time: "10:00:00",
  title: "Technical Interview",
  company: "Acme Corp",
  role_title: "Software Engineer",
  prep_checklist: [
    { id: "review-jd", text: "Review job description", checked: false },
    { id: "review-brief", text: "Re-read your interview prep brief", checked: true },
    { id: "prepare-questions", text: "Prepare 3 questions to ask", checked: false },
  ],
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("CalendarEventDetail", () => {
  it("should render the drawer at 480px width with slide transition", () => {
    render(<CalendarEventDetail event={BASE_EVENT} onClose={vi.fn()} />, { wrapper: makeWrapper() });

    const panel = screen.getByTestId("calendar-event-detail");
    expect(panel).toHaveStyle({ width: `${CALENDAR_EVENT_DRAWER_WIDTH_PX}px` });
    expect(panel.style.transitionDuration).toBe(`${DRAWER_ANIMATION_MS}ms`);
    expect(panel).toHaveClass("motion-safe-drawer");
  });

  it("should render default prep checklist items with checked state", () => {
    render(<CalendarEventDetail event={BASE_EVENT} onClose={vi.fn()} />, { wrapper: makeWrapper() });

    CALENDAR_EVENT_PREP_ITEMS.forEach((item) => {
      expect(screen.getByText(item.text)).toBeInTheDocument();
    });
    expect(screen.getByText("Re-read your interview prep brief")).toHaveClass("line-through");
  });

  it("should call PATCH mutation when a checklist item is toggled", async () => {
    const user = userEvent.setup();
    render(<CalendarEventDetail event={BASE_EVENT} onClose={vi.fn()} />, { wrapper: makeWrapper() });

    await user.click(screen.getByRole("checkbox", { name: /review job description/i }));

    await waitFor(() => {
      expect(PATCH_HANDLER).toHaveBeenCalledWith(
        expect.objectContaining({
          prep_checklist: expect.arrayContaining([
            expect.objectContaining({ id: "review-jd", text: "Review job description", checked: true }),
          ]),
        })
      );
    });
  });

  it("should render linked application and open application action", () => {
    render(<CalendarEventDetail event={BASE_EVENT} onClose={vi.fn()} />, { wrapper: makeWrapper() });

    expect(screen.getByRole("link", { name: /acme corp · software engineer/i })).toHaveAttribute(
      "href",
      "/applications/app1"
    );
    expect(screen.getByRole("link", { name: /open application/i })).toHaveAttribute(
      "href",
      "/applications/app1"
    );
  });

  it("should call onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CalendarEventDetail event={BASE_EVENT} onClose={onClose} />, { wrapper: makeWrapper() });

    await user.click(screen.getByRole("button", { name: /close event details/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
