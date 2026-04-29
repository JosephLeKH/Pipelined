/** Tests for OnboardingChecklist: renders steps, dismiss, step checked when condition met. */

import { render, screen, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import OnboardingChecklist from "./OnboardingChecklist";

const DEFAULT_STAGES = ["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"];

const server = setupServer(
  http.get("/api/applications", () =>
    HttpResponse.json({ data: [], meta: { total: 0, cursor: null } })
  ),
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        display_name: "Test User",
        default_stages: DEFAULT_STAGES,
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
  it("should render 3 steps", () => {
    // Arrange / Act
    render(<OnboardingChecklist onAdd={vi.fn()} />, { wrapper: Wrapper });

    // Assert
    expect(screen.getByText("Install the Chrome extension")).toBeInTheDocument();
    expect(screen.getByText("Add your first application")).toBeInTheDocument();
    expect(screen.getByText("Customize your pipeline stages")).toBeInTheDocument();
  });

  it("should hide checklist when dismiss button is clicked", () => {
    // Arrange
    render(<OnboardingChecklist onAdd={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByText("Install the Chrome extension")).toBeInTheDocument();

    // Act
    fireEvent.click(screen.getByText("Dismiss"));

    // Assert
    expect(screen.queryByText("Install the Chrome extension")).not.toBeInTheDocument();
    expect(localStorage.getItem("pipelined_onboarding_dismissed")).toBe("true");
  });

  it("should not render when localStorage dismiss key is set", () => {
    // Arrange
    localStorage.setItem("pipelined_onboarding_dismissed", "true");

    // Act
    render(<OnboardingChecklist onAdd={vi.fn()} />, { wrapper: Wrapper });

    // Assert
    expect(screen.queryByText("Install the Chrome extension")).not.toBeInTheDocument();
  });

  it("should show step 2 as checked when there are applications", async () => {
    // Arrange
    server.use(
      http.get("/api/applications", () =>
        HttpResponse.json({
          data: [{ id: "app1", company: "Acme", role_title: "SWE", current_stage: "Applied", source: "manual" }],
          meta: { total: 1, cursor: null },
        })
      )
    );

    // Act
    render(<OnboardingChecklist onAdd={vi.fn()} />, { wrapper: Wrapper });
    const step2Label = await screen.findByText("Add your first application");

    // Assert — step 2 label should be muted (done)
    expect(step2Label).toHaveClass("text-gray-400");
  });

  it("should show step 1 as checked when extension app exists", async () => {
    // Arrange
    server.use(
      http.get("/api/applications", () =>
        HttpResponse.json({
          data: [{ id: "app1", company: "Acme", role_title: "SWE", current_stage: "Applied", source: "extension" }],
          meta: { total: 1, cursor: null },
        })
      )
    );

    // Act
    render(<OnboardingChecklist onAdd={vi.fn()} />, { wrapper: Wrapper });
    const step1Label = await screen.findByText("Install the Chrome extension");

    // Assert — step 1 label should be muted (done)
    expect(step1Label).toHaveClass("text-gray-400");
  });

  it("should call onAdd when Add Application action is clicked", () => {
    // Arrange
    const onAdd = vi.fn();
    render(<OnboardingChecklist onAdd={onAdd} />, { wrapper: Wrapper });

    // Act
    fireEvent.click(screen.getByText("Add Application"));

    // Assert
    expect(onAdd).toHaveBeenCalledOnce();
  });
});
