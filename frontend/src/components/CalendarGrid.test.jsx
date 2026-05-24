/** Tests for CalendarGrid — month navigation, day cell accessibility, event chip rendering. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";

import CalendarGrid from "./CalendarGrid";
import { passthroughHandlers } from "../test/passthroughHandlers";

const server = setupServer(
  http.get("/api/calendar/events", () =>
    HttpResponse.json({ data: [], meta: { count: 0 } })
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
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const DEFAULT_PROPS = {
  month: 3,
  year: 2026,
  onMonthChange: vi.fn(),
  onEventClick: vi.fn(),
  onDayClick: vi.fn(),
};

describe("CalendarGrid", () => {
  it("should render the month and year heading", async () => {
    // Arrange / Act
    render(<CalendarGrid {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });

    // Assert
    expect(await screen.findByRole("heading", { name: /march 2026/i })).toBeInTheDocument();
  });

  it("should render day cells with aria-label containing the date", async () => {
    // Arrange / Act
    render(<CalendarGrid {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });

    // Assert — wait for loading to complete, then check day cell aria-labels
    const march1Cell = await screen.findByLabelText(/sunday, march 1, 2026/i);
    expect(march1Cell).toBeInTheDocument();

    const march15Cell = screen.getByLabelText(/sunday, march 15, 2026/i);
    expect(march15Cell).toBeInTheDocument();
  });

  it("should call onMonthChange with previous month when Previous month button clicked", async () => {
    // Arrange
    const onMonthChange = vi.fn();
    render(
      <CalendarGrid {...DEFAULT_PROPS} onMonthChange={onMonthChange} />,
      { wrapper: makeWrapper() }
    );
    await screen.findByRole("heading", { name: /march 2026/i });

    // Act
    await userEvent.click(screen.getByRole("button", { name: /previous month/i }));

    // Assert
    expect(onMonthChange).toHaveBeenCalledWith(2, 2026);
  });

  it("should call onMonthChange with next month when Next month button clicked", async () => {
    // Arrange
    const onMonthChange = vi.fn();
    render(
      <CalendarGrid {...DEFAULT_PROPS} onMonthChange={onMonthChange} />,
      { wrapper: makeWrapper() }
    );
    await screen.findByRole("heading", { name: /march 2026/i });

    // Act
    await userEvent.click(screen.getByRole("button", { name: /next month/i }));

    // Assert
    expect(onMonthChange).toHaveBeenCalledWith(4, 2026);
  });

  it("should call onDayClick with the date when a day cell is clicked", async () => {
    // Arrange
    const onDayClick = vi.fn();
    render(
      <CalendarGrid {...DEFAULT_PROPS} onDayClick={onDayClick} />,
      { wrapper: makeWrapper() }
    );

    // Wait for loading to finish, then click a day cell
    const cell = await screen.findByLabelText(/sunday, march 1, 2026/i);

    // Act
    await userEvent.click(cell);

    // Assert
    expect(onDayClick).toHaveBeenCalledWith(expect.any(Date));
  });

  it("should render event chips when events are present", async () => {
    // Arrange
    server.use(
      http.get("/api/calendar/events", () =>
        HttpResponse.json({
          data: [
            {
              id: "ev1",
              event_type: "phone_screen",
              date: "2026-03-10",
              time: "10:00",
              company: "Acme Corp",
              application_id: "app1",
            },
          ],
          meta: { count: 1 },
        })
      )
    );

    // Act
    render(<CalendarGrid {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });

    // Assert
    expect(await screen.findByText(/acme corp · phone screen/i)).toBeInTheDocument();
  });
});
