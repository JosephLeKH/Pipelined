/** Tests for OnboardingChecklist: agent onboarding steps, dismiss, completion. */

import { render, screen, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import OnboardingChecklist from "./OnboardingChecklist";
import {
  COPILOT_TRIED_KEY,
  ONBOARDING_DISMISSED_KEY,
  OPEN_COPILOT_EVENT,
  TODAY_VISITED_KEY,
} from "../lib/constants";

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        display_name: "Test User",
        agent_profile: {},
      },
    })
  )
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
  it("should render 3 agent onboarding steps", () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });

    expect(screen.getByText("Set agent profile")).toBeInTheDocument();
    expect(screen.getByText("Try co-pilot")).toBeInTheDocument();
    expect(screen.getByText("Open Today")).toBeInTheDocument();
  });

  it("should hide checklist when dismiss button is clicked", () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });
    expect(screen.getByText("Set agent profile")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(screen.queryByText("Set agent profile")).not.toBeInTheDocument();
    expect(localStorage.getItem(ONBOARDING_DISMISSED_KEY)).toBe("true");
  });

  it("should not render when localStorage dismiss key is set", () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");

    render(<OnboardingChecklist />, { wrapper: Wrapper });

    expect(screen.queryByText("Set agent profile")).not.toBeInTheDocument();
  });

  it("should show agent profile step as checked when profile is configured", async () => {
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({
          data: {
            id: "u1",
            email: "test@example.com",
            display_name: "Test User",
            agent_profile: {
              target_roles: ["Software Engineer"],
              career_goals: "Staff IC role",
            },
          },
        })
      )
    );

    render(<OnboardingChecklist />, { wrapper: Wrapper });
    const label = await screen.findByText("Set agent profile");

    expect(label).toHaveClass("text-text-3");
  });

  it("should mark co-pilot step complete and dispatch open event", () => {
    const handler = vi.fn();
    window.addEventListener(OPEN_COPILOT_EVENT, handler);

    render(<OnboardingChecklist />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("Open co-pilot"));

    expect(localStorage.getItem(COPILOT_TRIED_KEY)).toBe("true");
    expect(handler).toHaveBeenCalledOnce();

    window.removeEventListener(OPEN_COPILOT_EVENT, handler);
  });

  it("should mark Today step complete when Go to Today is clicked", () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("Go to Today"));

    expect(localStorage.getItem(TODAY_VISITED_KEY)).toBe("true");
  });

  it("should link to agent settings for profile step", () => {
    render(<OnboardingChecklist />, { wrapper: Wrapper });

    expect(screen.getByText("Go to Agent settings")).toBeInTheDocument();
  });
});
