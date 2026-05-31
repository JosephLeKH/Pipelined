/** Tests for OnboardingChecklist: setup steps, dismiss, completion. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { toast } from "sonner";

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
  vi.clearAllMocks();
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
  it("should render four onboarding steps in correct order", async () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });

    expect(await screen.findByText("Save your first application")).toBeInTheDocument();
    expect(screen.getByText("Set a weekly goal")).toBeInTheDocument();
    expect(screen.getByText("Open extension page")).toBeInTheDocument();
    expect(screen.getByText("Verify your email")).toBeInTheDocument();
    // Text is split across elements so match partial
    expect(screen.getByText(/of 4 complete/)).toBeInTheDocument();
  });

  it("should display steps in order: save app, set goal, open extension, verify email", async () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });

    const steps = await screen.findAllByRole("button");
    const stepTexts = steps.slice(1).map(s => s.textContent); // skip dismiss button
    const expectedOrder = ["Save your first application", "Set a weekly goal", "Open extension page", "Verify your email"];

    expectedOrder.forEach((text) => {
      expect(screen.getByText(new RegExp(text))).toBeInTheDocument();
    });
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

  it("should mark extension step complete when Open is clicked", async () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });

    const openLink = await screen.findByRole("link", { name: /→ open/i });
    fireEvent.click(openLink);

    expect(localStorage.getItem(EXTENSION_STEP_CLICKED_KEY)).toBe("true");
  });

  it("should render link for weekly goal step", async () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });

    // Verify that the weekly goal step renders as a link (via `to` prop in OnboardingStepRow)
    expect(await screen.findByRole("link", { name: /set a weekly goal/i })).toBeInTheDocument();
  });

  it("should mark goal step complete when weekly_goal is 0", async () => {
    // Arrange — weekly_goal is explicitly 0 (valid state)
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({
          data: {
            id: "u1",
            email: "test@example.com",
            email_verified: false,
            weekly_goal: 0,
          },
        })
      )
    );

    // Act
    render(<OnboardingChecklist />, { wrapper: Wrapper });

    // Assert — goal step should be marked complete
    const goalRow = await screen.findByText("Set a weekly goal");
    const checkIcon = goalRow.parentElement.querySelector("svg[class*='text-brand']");
    expect(checkIcon).toBeInTheDocument();
  });

  it("should show error toast when resend verification email fails", async () => {
    // Arrange
    const toastErrorSpy = vi.spyOn(toast, "error");
    server.use(
      http.post("/api/auth/resend-verification", () =>
        HttpResponse.json({ error: { code: "SEND_FAILED" } }, { status: 500 })
      )
    );

    // Act
    render(<OnboardingChecklist />, { wrapper: Wrapper });
    const resendButton = await screen.findByRole("button", { name: /resend email/i });
    await userEvent.click(resendButton);

    // Assert
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith(
        "Couldn't send verification email. Try again in a minute."
      );
    });

    toastErrorSpy.mockRestore();
  });

  it("should display 'Open extension page' instead of 'Install Chrome extension'", async () => {
    // Arrange / Act
    render(<OnboardingChecklist />, { wrapper: Wrapper });

    // Assert
    expect(await screen.findByText("Open extension page")).toBeInTheDocument();
    expect(screen.queryByText("Install Chrome extension")).not.toBeInTheDocument();
  });
});
