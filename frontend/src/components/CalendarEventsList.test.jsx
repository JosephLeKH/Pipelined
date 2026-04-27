/** Tests for CalendarEventsList — ARIA attributes, events list, and delete. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

const mockDeleteEvent = vi.fn();

vi.mock("../hooks/useCalendar", () => ({
  useApplicationEvents: vi.fn(() => ({ data: [], isLoading: false })),
  useDeleteEvent: vi.fn(() => ({ mutate: mockDeleteEvent })),
}));

import { useApplicationEvents } from "../hooks/useCalendar";
import CalendarEventsList from "./CalendarEventsList";

const MOCK_EVENTS = [
  { id: "ev1", event_type: "phone_screen", date: "2024-01-15", time: "10:00" },
  { id: "ev2", event_type: "onsite", date: "2024-01-20", time: null },
];

function renderList(props = {}) {
  return render(
    <CalendarEventsList applicationId="app1" onAddEvent={vi.fn()} {...props} />
  );
}

describe("CalendarEventsList", () => {
  it("should render heading as h3", () => {
    renderList();
    expect(screen.getByRole("heading", { name: /interviews & events/i })).toBeInTheDocument();
  });

  it("should render empty state with role=status when no events", () => {
    renderList();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("No events yet");
  });

  it("should render loading state with role=status when loading", () => {
    useApplicationEvents.mockReturnValue({ data: [], isLoading: true });
    renderList();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("should render events list as ul with aria-live=polite", () => {
    useApplicationEvents.mockReturnValue({ data: MOCK_EVENTS, isLoading: false });
    renderList();
    const ul = screen.getByRole("list");
    expect(ul).toHaveAttribute("aria-live", "polite");
  });

  it("should render each event as a list item", () => {
    useApplicationEvents.mockReturnValue({ data: MOCK_EVENTS, isLoading: false });
    renderList();
    expect(screen.getAllByRole("listitem").length).toBe(2);
  });

  it("should render event type text in each item", () => {
    useApplicationEvents.mockReturnValue({ data: MOCK_EVENTS, isLoading: false });
    renderList();
    expect(screen.getByText("phone screen")).toBeInTheDocument();
    expect(screen.getByText("onsite")).toBeInTheDocument();
  });

  it("should render delete button with descriptive aria-label", () => {
    useApplicationEvents.mockReturnValue({ data: MOCK_EVENTS, isLoading: false });
    renderList();
    const deleteBtn = screen.getByRole("button", { name: /delete event: phone screen on/i });
    expect(deleteBtn).toBeInTheDocument();
  });

  it("should call deleteEvent with event id when delete is clicked", async () => {
    useApplicationEvents.mockReturnValue({ data: MOCK_EVENTS, isLoading: false });
    renderList();
    const deleteBtn = screen.getByRole("button", { name: /delete event: phone screen on/i });
    await userEvent.click(deleteBtn);
    expect(mockDeleteEvent).toHaveBeenCalledWith("ev1");
  });

  it("should call onAddEvent with applicationId when Add Event is clicked", async () => {
    const onAddEvent = vi.fn();
    renderList({ onAddEvent });
    await userEvent.click(screen.getByRole("button", { name: /add event/i }));
    expect(onAddEvent).toHaveBeenCalledWith("app1");
  });
});
