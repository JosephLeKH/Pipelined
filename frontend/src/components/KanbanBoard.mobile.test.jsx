/** Tests for KanbanBoard — mobile swipe navigation and page indicator dots. */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import KanbanBoard from "./KanbanBoard";
import { passthroughHandlers } from "../test/passthroughHandlers";
import { withTooltipProvider } from "../test/testProviders";

const STAGES = ["Applied", "Phone Screen", "Offer"];

const APPS = [
  {
    id: "app1",
    company: "Alpha Inc",
    role_title: "Frontend Engineer",
    current_stage: "Applied",
    date_applied: "2026-03-01",
    updated_at: "2026-04-01T00:00:00Z",
    source: "manual",
  },
  {
    id: "app2",
    company: "Beta Corp",
    role_title: "Backend Dev",
    current_stage: "Phone Screen",
    date_applied: "2026-02-15",
    updated_at: "2026-04-01T00:00:00Z",
    source: "extension",
  },
];

const server = setupServer(
  http.get("/api/applications", () =>
    HttpResponse.json({ data: APPS, meta: { count: APPS.length, next_cursor: null } })
  ),
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "user@example.com",
        display_name: "Test User",
        default_stages: STAGES,
      },
    })
  ),
  ...passthroughHandlers,
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
      <MemoryRouter>
        <AuthProvider>{withTooltipProvider(children)}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function renderAndWait() {
  render(<KanbanBoard filters={{}} onSelect={() => {}} />, { wrapper: makeWrapper() });
  // Wait for loading to finish — mobile swipe container only appears after isLoading=false
  await screen.findByTestId("mobile-kanban-swipe");
  // Wait for at least one card to appear (scoped to mobile view to avoid desktop duplicate)
  const mobileSwipe = screen.getByTestId("mobile-kanban-swipe");
  await within(mobileSwipe).findByText("Alpha Inc");
}

describe("KanbanBoard — mobile page dots", () => {
  it("should render page indicator dots for each stage", async () => {
    await renderAndWait();

    const dotContainer = screen.getByLabelText("Stage navigation dots");

    expect(within(dotContainer).getByRole("button", { name: "Applied" })).toBeInTheDocument();
    expect(within(dotContainer).getByRole("button", { name: "Phone Screen" })).toBeInTheDocument();
    expect(within(dotContainer).getByRole("button", { name: "Offer" })).toBeInTheDocument();
  });

  it("should mark the active stage dot as pressed", async () => {
    await renderAndWait();

    const dotContainer = screen.getByLabelText("Stage navigation dots");
    const appliedDot = within(dotContainer).getByRole("button", { name: "Applied" });
    const phoneDot = within(dotContainer).getByRole("button", { name: "Phone Screen" });

    expect(appliedDot).toHaveAttribute("aria-pressed", "true");
    expect(phoneDot).toHaveAttribute("aria-pressed", "false");
  });

  it("should navigate to a stage when its dot is clicked", async () => {
    const user = userEvent.setup();
    await renderAndWait();

    const dotContainer = screen.getByLabelText("Stage navigation dots");
    const phoneDot = within(dotContainer).getByRole("button", { name: "Phone Screen" });

    await user.click(phoneDot);

    const mobileSwipe = screen.getByTestId("mobile-kanban-swipe");
    await waitFor(() => {
      expect(within(mobileSwipe).getByTestId("kanban-column-Phone Screen")).toBeInTheDocument();
    });
  });
});

describe("KanbanBoard — mobile swipe navigation", () => {
  let dateNowSpy;

  beforeAll(() => {
    const t = Date.now();
    dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(t);
  });

  afterAll(() => {
    dateNowSpy?.mockRestore();
  });

  it("should navigate to the next stage on left swipe", async () => {
    await renderAndWait();
    const swipeContainer = screen.getByTestId("mobile-kanban-swipe");

    // Initially shows Applied
    expect(within(swipeContainer).getByTestId("kanban-column-Applied")).toBeInTheDocument();

    // Left swipe: dx=-120, dy=5, within 300ms
    fireEvent.touchStart(swipeContainer, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchEnd(swipeContainer, { changedTouches: [{ clientX: 180, clientY: 105 }] });

    await waitFor(() => {
      expect(within(swipeContainer).getByTestId("kanban-column-Phone Screen")).toBeInTheDocument();
      expect(within(swipeContainer).queryByTestId("kanban-column-Applied")).not.toBeInTheDocument();
    });
  });

  it("should navigate to the previous stage on right swipe", async () => {
    const user = userEvent.setup();
    await renderAndWait();
    const swipeContainer = screen.getByTestId("mobile-kanban-swipe");

    // First navigate to Phone Screen via dot click
    const dotContainer = screen.getByLabelText("Stage navigation dots");
    await user.click(within(dotContainer).getByRole("button", { name: "Phone Screen" }));
    await waitFor(() => {
      expect(within(swipeContainer).getByTestId("kanban-column-Phone Screen")).toBeInTheDocument();
    });

    // Right swipe: dx=+120, dy=5
    fireEvent.touchStart(swipeContainer, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(swipeContainer, { changedTouches: [{ clientX: 220, clientY: 105 }] });

    await waitFor(() => {
      expect(within(swipeContainer).getByTestId("kanban-column-Applied")).toBeInTheDocument();
      expect(within(swipeContainer).queryByTestId("kanban-column-Phone Screen")).not.toBeInTheDocument();
    });
  });

  it("should not navigate when swipe distance is below threshold", async () => {
    await renderAndWait();
    const swipeContainer = screen.getByTestId("mobile-kanban-swipe");

    // Short swipe: dx=-40 (< 80px threshold)
    fireEvent.touchStart(swipeContainer, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(swipeContainer, { changedTouches: [{ clientX: 160, clientY: 103 }] });

    // Should still show Applied
    expect(within(swipeContainer).getByTestId("kanban-column-Applied")).toBeInTheDocument();
  });

  it("should not navigate past the last stage on left swipe", async () => {
    const user = userEvent.setup();
    await renderAndWait();
    const swipeContainer = screen.getByTestId("mobile-kanban-swipe");

    // Navigate to last stage (Offer)
    const dotContainer = screen.getByLabelText("Stage navigation dots");
    await user.click(within(dotContainer).getByRole("button", { name: "Offer" }));
    await waitFor(() => {
      expect(within(swipeContainer).getByTestId("kanban-column-Offer")).toBeInTheDocument();
    });

    // Left swipe from last stage — should stay on Offer
    fireEvent.touchStart(swipeContainer, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchEnd(swipeContainer, { changedTouches: [{ clientX: 180, clientY: 105 }] });

    expect(within(swipeContainer).getByTestId("kanban-column-Offer")).toBeInTheDocument();
  });
});
