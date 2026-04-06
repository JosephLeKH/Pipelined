/** Tests for CalendarEventDetail — prep notes render, checklist add, toggle mutation. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";

import CalendarEventDetail from "./CalendarEventDetail";

const PATCH_HANDLER = vi.fn();

const server = setupServer(
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
        prep_notes: body.prep_notes ?? "Initial notes",
        prep_checklist: body.prep_checklist ?? [],
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); PATCH_HANDLER.mockClear(); });
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
  prep_notes: "Initial notes",
  prep_checklist: [
    { id: "item-1", text: "Research company culture", checked: false },
    { id: "item-2", text: "Review system design", checked: true },
  ],
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("CalendarEventDetail", () => {
  it("should render prep notes and checklist items", () => {
    // Arrange / Act
    render(
      <CalendarEventDetail event={BASE_EVENT} onClose={vi.fn()} />,
      { wrapper: makeWrapper() }
    );

    // Assert — notes textarea shows saved value
    const notesTextarea = screen.getByRole("textbox", { name: /prep notes/i });
    expect(notesTextarea).toHaveValue("Initial notes");

    // Assert — checklist items render
    expect(screen.getByText("Research company culture")).toBeInTheDocument();
    expect(screen.getByText("Review system design")).toBeInTheDocument();

    // Assert — checked item has line-through styling class
    const checkedItem = screen.getByText("Review system design");
    expect(checkedItem).toHaveClass("line-through");
  });

  it("should add a new checklist item when user types and presses Enter", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <CalendarEventDetail event={{ ...BASE_EVENT, prep_checklist: [] }} onClose={vi.fn()} />,
      { wrapper: makeWrapper() }
    );

    // Act
    const input = screen.getByRole("textbox", { name: /new checklist item/i });
    await user.type(input, "Prepare STAR stories");
    await user.keyboard("{Enter}");

    // Assert — item appears in the list
    expect(await screen.findByText("Prepare STAR stories")).toBeInTheDocument();

    // Assert — PATCH was called with the new checklist
    await waitFor(() => {
      expect(PATCH_HANDLER).toHaveBeenCalledWith(
        expect.objectContaining({
          prep_checklist: expect.arrayContaining([
            expect.objectContaining({ text: "Prepare STAR stories", checked: false }),
          ]),
        })
      );
    });
  });

  it("should call PATCH mutation when a checklist item is toggled", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <CalendarEventDetail event={BASE_EVENT} onClose={vi.fn()} />,
      { wrapper: makeWrapper() }
    );

    // Act — toggle the unchecked first item
    const checkbox = screen.getByRole("checkbox", { name: /research company culture/i });
    await user.click(checkbox);

    // Assert — PATCH was called with the toggled item (now checked: true)
    await waitFor(() => {
      expect(PATCH_HANDLER).toHaveBeenCalledWith(
        expect.objectContaining({
          prep_checklist: expect.arrayContaining([
            expect.objectContaining({ id: "item-1", text: "Research company culture", checked: true }),
          ]),
        })
      );
    });
  });

  it("should call onClose when the close button is clicked", async () => {
    // Arrange
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <CalendarEventDetail event={BASE_EVENT} onClose={onClose} />,
      { wrapper: makeWrapper() }
    );

    // Act
    await user.click(screen.getByRole("button", { name: /close event details/i }));

    // Assert
    expect(onClose).toHaveBeenCalledOnce();
  });
});
