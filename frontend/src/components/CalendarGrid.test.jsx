/** Tests for CalendarGrid — day cell accessibility, event dots, month navigation moved to page. */

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
  onDayClick: vi.fn(),
};

describe("CalendarGrid", () => {
  it("should render weekday column headers", async () => {
    render(<CalendarGrid {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });

    expect(await screen.findByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
  });

  it("should render day cells with aria-label containing the date", async () => {
    render(<CalendarGrid {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });

    const march1Cell = await screen.findByLabelText(/sunday, march 1, 2026/i);
    expect(march1Cell).toBeInTheDocument();

    const march15Cell = screen.getByLabelText(/sunday, march 15, 2026/i);
    expect(march15Cell).toBeInTheDocument();
  });

  it("should call onDayClick with the date when a day cell is clicked", async () => {
    const onDayClick = vi.fn();
    render(<CalendarGrid {...DEFAULT_PROPS} onDayClick={onDayClick} />, { wrapper: makeWrapper() });

    const cell = await screen.findByLabelText(/sunday, march 1, 2026/i);
    await userEvent.click(cell);

    expect(onDayClick).toHaveBeenCalledWith(expect.any(Date));
  });

  it("should render event dots when events are present", async () => {
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

    render(<CalendarGrid {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });

    const cell = await screen.findByLabelText(/tuesday, march 10, 2026, 1 event/i);
    expect(cell).toBeInTheDocument();
    expect(cell.querySelector(".rounded-full.bg-brand-600")).toBeTruthy();
  });

  it("should highlight today with Cardinal top border", async () => {
    const now = new Date();
    render(
      <CalendarGrid month={now.getMonth() + 1} year={now.getFullYear()} onDayClick={vi.fn()} />,
      { wrapper: makeWrapper() }
    );

    const todayCell = await screen.findByRole("button", { current: "date" });
    expect(todayCell).toHaveClass("border-t-brand-600");
  });

  it("should mark selected date with pressed state", async () => {
    render(<CalendarGrid {...DEFAULT_PROPS} selectedDate="2026-03-15" />, { wrapper: makeWrapper() });

    const selectedCell = await screen.findByLabelText(/sunday, march 15, 2026/i);
    expect(selectedCell).toHaveAttribute("aria-pressed", "true");
  });
});
