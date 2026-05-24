/** Tests for PendingInboxPage — list, approve, dismiss, external link. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import PendingInboxPage from "./PendingInboxPage";
import { passthroughHandlers } from "../test/passthroughHandlers";

const MOCK_OPPORTUNITY = {
  id: "opp1",
  job_listing_id: "listing1",
  match_score: 92,
  match_reason: "Strong Python overlap",
  cover_letter: { subject: "Application", body: "Dear hiring team" },
  resume_tips: { summary: "Highlight backend work", bullet_suggestions: ["Add metrics"] },
  status: "pending",
  created_at: "2026-05-23T05:00:00.000Z",
  listing_company: "Acme",
  listing_role: "Backend Engineer",
  listing_apply_url: "https://example.com/jobs/acme",
};

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "user1",
        email: "test@test.com",
        display_name: "Test",
        has_resume: true,
        default_stages: [],
      },
    })
  ),
  http.post("/api/auth/refresh", () => HttpResponse.json({ data: { ok: true } })),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  server.use(
    http.get("/api/autopilot/pending", () => HttpResponse.json({ data: [MOCK_OPPORTUNITY] }))
  );
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeWrapper(initialEntries = ["/inbox/pending"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return (
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route path="/inbox/pending" element={children} />
                <Route path="/dashboard" element={<div>Dashboard</div>} />
              </Routes>
            </MemoryRouter>
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  };
}

describe("PendingInboxPage", () => {
  it("should render pending opportunity cards with match score and cover letter", async () => {
    render(<PendingInboxPage />, { wrapper: makeWrapper() });

    expect(await screen.findByText("Acme — Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText(/match score 92/i)).toBeInTheDocument();
    expect(screen.getByText("Dear hiring team")).toBeInTheDocument();
    expect(screen.getByText(/suggestions only/i)).toBeInTheDocument();
  });

  it("should render external apply link with noopener", async () => {
    render(<PendingInboxPage />, { wrapper: makeWrapper() });

    const link = await screen.findByRole("link", { name: /view job/i });
    expect(link).toHaveAttribute("href", "https://example.com/jobs/acme");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should dismiss an opportunity", async () => {
    let pendingItems = [MOCK_OPPORTUNITY];
    server.use(
      http.get("/api/autopilot/pending", () => HttpResponse.json({ data: pendingItems })),
      http.post("/api/autopilot/pending/opp1/dismiss", () => {
        pendingItems = [];
        return HttpResponse.json({ data: { message: "Dismissed" } });
      })
    );

    render(<PendingInboxPage />, { wrapper: makeWrapper() });
    await screen.findByText("Acme — Backend Engineer");

    await userEvent.click(screen.getByRole("button", { name: /dismiss acme/i }));

    await waitFor(() => {
      expect(screen.getByText("Inbox empty")).toBeInTheDocument();
    });
  });
});
