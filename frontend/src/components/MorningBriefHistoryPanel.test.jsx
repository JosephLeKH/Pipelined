/** Tests for MorningBriefHistoryPanel collapsible history list. */

import { render, screen, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

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
  it("should render collapsible previous briefs header", async () => {
    render(<MorningBriefHistoryPanel />, { wrapper: makeWrapper() });

    expect(await screen.findByRole("button", { name: /previous briefs/i })).toBeInTheDocument();
  });

  it("should expand to show past brief summaries", async () => {
    render(<MorningBriefHistoryPanel />, { wrapper: makeWrapper() });

    fireEvent.click(await screen.findByRole("button", { name: /previous briefs/i }));

    expect(await screen.findByText("2026-05-22")).toBeInTheDocument();
    expect(screen.getByText("2 interviews")).toBeInTheDocument();
    expect(screen.queryByText("2026-05-23")).not.toBeInTheDocument();
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

    render(<MorningBriefHistoryPanel />, { wrapper: makeWrapper() });

    expect(screen.queryByRole("button", { name: /previous briefs/i })).not.toBeInTheDocument();
  });
});
