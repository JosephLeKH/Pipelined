/** Integration test for approve flow — redirects to dashboard with application id. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import PendingInboxPage from "./PendingInboxPage";
import { passthroughHandlers } from "../test/passthroughHandlers";
import { toast } from "sonner";

const MOCK_OPPORTUNITY = {
  id: "opp1",
  job_listing_id: "listing1",
  match_score: 88,
  match_reason: "Good fit",
  cover_letter: { subject: "Hi", body: "Cover letter body" },
  resume_tips: { summary: "Tip", bullet_suggestions: [] },
  status: "pending",
  created_at: "2026-05-23T05:00:00.000Z",
  listing_company: "Beta Corp",
  listing_role: "Engineer",
  listing_apply_url: "https://example.com/jobs/beta",
};

function LocationCapture() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

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
    http.get("/api/autopilot/pending", () => HttpResponse.json({ data: [MOCK_OPPORTUNITY] })),
    http.post("/api/autopilot/pending/opp1/approve", () =>
      HttpResponse.json({ data: { opportunity_id: "opp1", application_id: "app99" } })
    )
  );
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }) {
    return (
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/inbox/pending"]}>
              <LocationCapture />
              <Routes>
                <Route path="/inbox/pending" element={children} />
                <Route path="/dashboard" element={<div>Dashboard detail</div>} />
              </Routes>
            </MemoryRouter>
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  };
}

describe("PendingInboxPage approve flow", () => {
  it("should redirect to dashboard detail and show toast after approve", async () => {
    render(<PendingInboxPage />, { wrapper: makeWrapper() });

    await screen.findByText("Beta Corp — Engineer");
    await userEvent.click(screen.getByRole("button", { name: /approve beta corp/i }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/dashboard?selected=app99");
    });
    expect(toast.success).toHaveBeenCalledWith("Added to pipeline — apply when ready");
  });
});
