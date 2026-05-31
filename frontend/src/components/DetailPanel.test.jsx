/** Tests for DetailPanel — field display, notes blur, stage change, close on Escape/click-outside. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import DetailPanel from "./DetailPanel";
import { DETAIL_PANEL_WIDTH_PX } from "../lib/constants";
import { passthroughHandlers } from "../test/passthroughHandlers";

const APP = {
  id: "app1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Applied",
  date_applied: "2026-01-15T00:00:00Z",
  updated_at: "2026-03-20T00:00:00Z",
  source: "manual",
  source_url: "https://example.com/job/123",
  location: "San Francisco, CA",
  remote_status: "hybrid",
  compensation: "$150k",
  company_type: "startup",
  notes: "Great company!",
  stage_history: [
    { stage: "Applied", transitioned_at: "2026-01-15T00:00:00Z" },
    { stage: "Phone Screen", transitioned_at: "2026-01-20T00:00:00Z" },
  ],
};

const server = setupServer(
  http.patch("/api/applications/:id", () => HttpResponse.json({ data: APP })),
  http.get("/api/calendar/events", () => HttpResponse.json({ data: [], meta: { count: 0 } })),
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        display_name: "Test User",
        default_stages: ["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"],
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

describe("DetailPanel", () => {
  it("should display role_title and company when application is provided", () => {
    // Arrange / Act
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    expect(screen.getByRole("heading", { name: "Acme Corp · Software Engineer" })).toBeInTheDocument();
  });

  it("should display location, remote_status, compensation, and company_type fields", () => {
    // Arrange / Act
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    expect(screen.getByText("San Francisco, CA")).toBeInTheDocument();
    expect(screen.getByText("hybrid")).toBeInTheDocument();
    expect(screen.getByText("$150k")).toBeInTheDocument();
    expect(screen.getByText("startup")).toBeInTheDocument();
  });

  it("should render a link to source_url labeled 'Job posting'", () => {
    // Arrange / Act
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    const link = screen.getByRole("link", { name: /job posting/i });
    expect(link).toHaveAttribute("href", "https://example.com/job/123");
  });

  it("should render the notes field with the saved value", () => {
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    expect(screen.getByTestId("rich-text-editor")).toHaveTextContent("Great company!");
  });

  it("should show notes editor without save or cancel buttons", () => {
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit notes/i })).not.toBeInTheDocument();
  });

  // Editing-behavior tests (blur → discard dialog, draft persistence) live in
  // Playwright e2e because JSDOM cannot fully simulate Tiptap's contentEditable.

  it("should call PATCH with new stage on stage select change", async () => {
    // Arrange
    let patchBody = null;
    server.use(
      http.patch("/api/applications/:id", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ data: APP });
      })
    );
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    await waitFor(() => expect(screen.getByRole("button", { name: /stage/i })).toBeInTheDocument());

    // Act — open stage dropdown and pick a new stage
    await userEvent.click(screen.getByRole("button", { name: /stage/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /phone screen/i }));

    // Assert
    await waitFor(() => expect(patchBody).toEqual({ current_stage: "Phone Screen" }));
  });

  it("should render timeline stage entries in chronological order", async () => {
    // Arrange / Act
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert — first entry is the initial stage, second is the transition
    const timeline = await screen.findByTestId("timeline");
    const stageNodes = timeline.querySelectorAll("[data-testid='timeline-stage-node']");
    expect(stageNodes).toHaveLength(2);
    expect(stageNodes[0]).toHaveTextContent("Applied");
    expect(stageNodes[1]).toHaveTextContent("Applied → Phone Screen");
  });

  it("should show calendar events at correct chronological positions in timeline", async () => {
    // Arrange — event on Jan 18 falls between Applied (Jan 15) and Phone Screen (Jan 20)
    server.use(
      http.get("/api/calendar/events", () =>
        HttpResponse.json({
          data: [
            {
              id: "ev1",
              application_id: "app1",
              event_type: "phone_screen",
              date: "2026-01-18",
              title: "HR Call",
              time: null,
            },
          ],
          meta: { count: 1 },
        })
      )
    );
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Wait for event to load, then verify chronological order
    await screen.findByText("HR Call");

    const timeline = screen.getByTestId("timeline");
    const items = timeline.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Applied");
    expect(items[1]).toHaveTextContent("HR Call");
    expect(items[2]).toHaveTextContent("Applied → Phone Screen");
  });

  it("should show 'No activity yet' when stage_history is empty and no events exist", async () => {
    // Arrange — app with no stage history (server returns empty events by default)
    const emptyApp = { ...APP, stage_history: [] };
    render(<DetailPanel application={emptyApp} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    expect(await screen.findByTestId("timeline-empty")).toHaveTextContent("No activity yet");
  });

  it("should call onClose when close button is clicked", async () => {
    // Arrange
    const onClose = vi.fn();
    render(<DetailPanel application={APP} onClose={onClose} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.click(screen.getByRole("button", { name: /close panel/i }));

    // Assert
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onClose when Escape key is pressed", async () => {
    // Arrange
    const onClose = vi.fn();
    render(<DetailPanel application={APP} onClose={onClose} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.keyboard("{Escape}");

    // Assert
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onClose when clicking the overlay outside the panel", () => {
    // Arrange
    const onClose = vi.fn();
    render(<DetailPanel application={APP} onClose={onClose} />, { wrapper: makeWrapper() });

    // Act — click the overlay element directly (not the inner panel)
    const overlay = screen.getByTestId("panel-overlay");
    fireEvent.click(overlay, { target: overlay });

    // Assert
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should move focus to the first focusable element when panel opens", async () => {
    // Arrange / Act
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert — close button is the first focusable element in PanelHeader
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /close panel/i })).toHaveFocus();
    });
  });

  it("should trap focus: Tab from last focusable element wraps to first", async () => {
    // Arrange
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByRole("heading", { name: "Acme Corp · Software Engineer" });

    const dialog = screen.getByRole("dialog");
    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
    const focusableEls = Array.from(dialog.querySelectorAll(FOCUSABLE));
    const lastEl = focusableEls[focusableEls.length - 1];

    // Act — focus last element and fire Tab
    lastEl.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: false });

    // Assert — focus wrapped to first element
    expect(document.activeElement).toBe(focusableEls[0]);
  });

  it("should trap focus: Shift+Tab from first focusable element wraps to last", async () => {
    // Arrange
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByRole("heading", { name: "Acme Corp · Software Engineer" });

    const dialog = screen.getByRole("dialog");
    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
    const focusableEls = Array.from(dialog.querySelectorAll(FOCUSABLE));

    // Act — focus first element and fire Shift+Tab
    focusableEls[0].focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });

    // Assert — focus wrapped to last element
    expect(document.activeElement).toBe(focusableEls[focusableEls.length - 1]);
  });

  it("should be visually hidden when application is null", () => {
    // Arrange / Act
    render(<DetailPanel application={null} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert — overlay has opacity-0 / pointer-events-none, panel is closed
    const overlay = screen.getByTestId("panel-overlay");
    expect(overlay).toHaveClass("opacity-0");
    expect(overlay).toHaveClass("pointer-events-none");
  });

  it("should render the drawer at the configured panel width with 220ms slide transition", () => {
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    const panel = screen.getByTestId("detail-panel");
    // Width is now a Tailwind class (md:max-w-[520px]) for responsive behavior
    expect(panel).toHaveClass("md:max-w-[520px]");
    expect(panel.style.transitionDuration).toBe("220ms");
    expect(panel).toHaveClass("motion-safe-drawer");
  });

  it("should position overlay to cover full viewport", () => {
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Overlay now uses inset-0 to cover entire viewport, with drawer positioned at top-11 on the right
    expect(screen.getByTestId("panel-overlay")).toHaveClass("inset-0");
  });

  it("should revert stage optimistically when stage update fails", async () => {
    // Arrange — PATCH will fail
    server.use(
      http.patch("/api/applications/:id", () =>
        HttpResponse.json({ error: { code: "INTERNAL_ERROR", message: "Server error" } }, { status: 500 })
      )
    );
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    const stageTrigger = await screen.findByRole("button", { name: /stage/i });
    await waitFor(() => expect(stageTrigger).toHaveTextContent("Applied"));

    // Act — pick a different stage; optimistic update fires then rolls back on error
    await userEvent.click(stageTrigger);
    await userEvent.click(screen.getByRole("menuitem", { name: /^offer$/i }));

    // Assert — after server error, original stage is restored on the trigger
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /stage/i })).toHaveTextContent("Applied");
    });
  });
});
