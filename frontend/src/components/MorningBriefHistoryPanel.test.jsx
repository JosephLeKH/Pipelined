/** Tests for MorningBriefHistoryPanel right drawer. */

import { render, screen, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import MorningBriefHistoryPanel from "./MorningBriefHistoryPanel";

const MOCK_HISTORY = {
  data: [
    { date: "2026-05-23", summary_line: "1 follow-up", sections: {} },
    { date: "2026-05-22", summary_line: "2 interviews", sections: {} },
    { date: "2026-05-21", summary_line: "All caught up", sections: {} },
  ],
  meta: { days: 7 },
};

const server = setupServer(
  http.get("/api/brief/history", () => HttpResponse.json(MOCK_HISTORY)),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("MorningBriefHistoryPanel", () => {
  it("should render drawer with past brief summaries when open", async () => {
    render(
      <MorningBriefHistoryPanel open onClose={() => {}} />,
      { wrapper: makeWrapper() },
    );

    expect(await screen.findByRole("dialog", { name: /previous briefs/i })).toBeInTheDocument();
    expect(screen.getByText("2026-05-22")).toBeInTheDocument();
    expect(screen.getByText("2 interviews")).toBeInTheDocument();
    expect(screen.queryByText("2026-05-23")).not.toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <MorningBriefHistoryPanel open onClose={onClose} />,
      { wrapper: makeWrapper() },
    );

    await screen.findByRole("dialog", { name: /previous briefs/i });
    fireEvent.click(screen.getByRole("button", { name: /^Close$/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("should hide panel when only today exists in history", async () => {
    server.use(
      http.get("/api/brief/history", () =>
        HttpResponse.json({
          data: [{ date: "2026-05-23", summary_line: "Today only", sections: {} }],
          meta: { days: 7 },
        })
      )
    );

    const { container } = render(
      <MorningBriefHistoryPanel open onClose={() => {}} />,
      { wrapper: makeWrapper() },
    );

    await vi.waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("should show error message and retry button on fetch failure", async () => {
    server.use(
      http.get("/api/brief/history", () => HttpResponse.error())
    );

    render(
      <MorningBriefHistoryPanel open onClose={() => {}} />,
      { wrapper: makeWrapper() },
    );

    expect(await screen.findByText(/Couldn't load brief history/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
  });

  it("should keep drawer open when error occurs", async () => {
    server.use(
      http.get("/api/brief/history", () => HttpResponse.error())
    );

    render(
      <MorningBriefHistoryPanel open onClose={() => {}} />,
      { wrapper: makeWrapper() },
    );

    await screen.findByText(/Couldn't load brief history/i);
    const dialog = screen.getByRole("dialog", { name: /previous briefs/i });
    expect(dialog).toBeVisible();
  });
});
