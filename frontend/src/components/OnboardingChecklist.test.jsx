/** Tests for OnboardingChecklist: setup steps, dismiss, completion. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import OnboardingChecklist from "./OnboardingChecklist";
import {
  EXTENSION_STEP_CLICKED_KEY,
  ONBOARDING_DISMISSED_KEY,
} from "../lib/constants";

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        display_name: "Test User",
        email_verified: false,
        weekly_goal: 0,
      },
    }),
  ),
  http.get("/api/applications/stats", () =>
    HttpResponse.json({ data: { total_applied: 0, applied_this_week: 0 } }),
  ),
  http.get("/api/email/status", () =>
    HttpResponse.json({ data: { connected: false, apps_tracked: 0 } }),
  ),
  http.post("/api/auth/resend-verification", () => HttpResponse.json({ data: { ok: true } })),
  http.post("/api/auth/refresh", () => HttpResponse.json({ data: { ok: true } })),
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

function Wrapper({ children }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("OnboardingChecklist", () => {
  it("should render five onboarding steps", async () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });

    expect(await screen.findByText("Verify your email")).toBeInTheDocument();
    expect(screen.getByText("Save your first application")).toBeInTheDocument();
    expect(screen.getByText("Connect Gmail")).toBeInTheDocument();
    expect(screen.getByText("Set a weekly goal")).toBeInTheDocument();
    expect(screen.getByText("Install Chrome extension")).toBeInTheDocument();
    expect(screen.getByText("0 of 5 complete")).toBeInTheDocument();
  });

  it("should hide checklist when dismiss button is clicked", async () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });
    expect(await screen.findByText("Verify your email")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /dismiss checklist/i }));

    expect(screen.queryByText("Verify your email")).not.toBeInTheDocument();
    expect(localStorage.getItem(ONBOARDING_DISMISSED_KEY)).toBe("true");
  });

  it("should not render when localStorage dismiss key is set", () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");

    render(<OnboardingChecklist />, { wrapper: Wrapper });

    expect(screen.queryByText("Verify your email")).not.toBeInTheDocument();
  });

  it("should hide when all steps are complete", async () => {
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({
          data: {
            id: "u1",
            email: "test@example.com",
            email_verified: true,
            weekly_goal: 5,
          },
        }),
      ),
      http.get("/api/applications/stats", () =>
        HttpResponse.json({ data: { total_applied: 3, applied_this_week: 1 } }),
      ),
      http.get("/api/email/status", () =>
        HttpResponse.json({ data: { connected: true, apps_tracked: 1 } }),
      ),
    );
    localStorage.setItem(EXTENSION_STEP_CLICKED_KEY, "true");

    render(<OnboardingChecklist />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.queryByText("Verify your email")).not.toBeInTheDocument();
    });
    expect(localStorage.getItem(ONBOARDING_DISMISSED_KEY)).toBe("true");
  });

  it("should mark extension step complete when Install is clicked", async () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });

    const installLink = await screen.findByRole("link", { name: /→ install/i });
    fireEvent.click(installLink);

    expect(localStorage.getItem(EXTENSION_STEP_CLICKED_KEY)).toBe("true");
  });

  it("should link to pipeline settings for weekly goal step", async () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });

    const goalLink = await screen.findByRole("link", { name: /→ set goal/i });
    expect(goalLink).toHaveAttribute("href", "/settings?section=pipeline");
  });
});
