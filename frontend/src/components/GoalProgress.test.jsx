/** Tests for GoalProgress — verifies progress ring rendering and streak display. */

import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import GoalProgress from "./GoalProgress";
import { passthroughHandlers } from "../test/passthroughHandlers";

// Mock AuthContext so we control weekly_goal without needing a real provider
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { weekly_goal: 5 } }),
}));

// Mock sonner to avoid side effects
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const server = setupServer(
  http.get("/api/applications/stats", () =>
    HttpResponse.json({
      data: {
        total_applied: 10,
        active_count: 8,
        response_rate: 0.2,
        applied_this_week: 3,
        current_streak: 2,
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
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("GoalProgress", () => {
  it("should display applied count and weekly goal", async () => {
    render(<GoalProgress />, { wrapper: makeWrapper() });

    const label = await screen.findByText(/3 \/ 5 this week/i);
    expect(label).toBeDefined();
  });

  it("should show streak when current_streak is greater than zero", async () => {
    render(<GoalProgress />, { wrapper: makeWrapper() });

    const streak = await screen.findByText(/2 week streak/i);
    expect(streak).toBeDefined();
  });

  it("should hide streak when current_streak is zero", async () => {
    server.use(
      http.get("/api/applications/stats", () =>
        HttpResponse.json({
          data: {
            total_applied: 5,
            active_count: 5,
            response_rate: 0.0,
            applied_this_week: 1,
            current_streak: 0,
          },
        })
      )
    );

    render(<GoalProgress />, { wrapper: makeWrapper() });

    await screen.findByText(/1 \/ 5 this week/i);
    expect(screen.queryByText(/week streak/i)).toBeNull();
  });
});
