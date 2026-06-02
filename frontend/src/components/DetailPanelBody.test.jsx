/** Tests for the redesigned PanelBody: overview rail, tabs, and tab content. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { PanelBody } from "./DetailPanelBody";

const APP = {
  id: "app1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Applied",
  date_applied: "2026-01-15T00:00:00Z",
  notes: "",
  tags: [],
  stage_history: [],
  fit_score: null,
  fit_score_reason: null,
};

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        default_stages: ["Applied", "Phone Screen", "Offer", "Rejected"],
        has_resume: false,
        ai_scores_remaining_today: 5,
      },
    })
  ),
  http.get("/api/applications/:id/contacts", () => HttpResponse.json({ data: [] })),
  http.get("/api/applications/:id/email-events", () => HttpResponse.json({ data: [] })),
  http.get("/api/calendar/events", () => HttpResponse.json({ data: [], meta: { count: 0 } })),
  http.get("/api/agent/activity", () => HttpResponse.json({ data: [] }))
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function renderBody(overrides = {}) {
  const props = {
    application: APP,
    handleStageChange: vi.fn(),
    handleUpdate: vi.fn(),
    onAddEvent: vi.fn(),
    onDirtyChange: vi.fn(),
    ...overrides,
  };
  return render(<PanelBody {...props} />, { wrapper });
}

describe("PanelBody — overview rail", () => {
  it("renders the stage selector and Scout's Take in the rail", () => {
    renderBody();

    expect(screen.getByLabelText("Stage")).toBeInTheDocument();
    expect(screen.getByLabelText("Scout's Take")).toBeInTheDocument();
  });
});

describe("PanelBody — tabs", () => {
  it("renders all four tabs and defaults to Overview", () => {
    renderBody();

    expect(screen.getByRole("tab", { name: /overview/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /agents/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /activity/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /notes/i })).toBeInTheDocument();
  });

  it("switches to Agents tab on click and reveals the agent rows", async () => {
    const user = userEvent.setup();
    renderBody();

    await user.click(screen.getByRole("tab", { name: /agents/i }));

    expect(screen.getByText(/Apply Pack/i)).toBeInTheDocument();
    expect(screen.getByText(/Interview Prep/i)).toBeInTheDocument();
    expect(screen.getByText(/Follow-up Draft/i)).toBeInTheDocument();
  });

  it("opens on Agents tab when expandFollowUpDraft is true", () => {
    renderBody({ expandFollowUpDraft: true });

    expect(screen.getByRole("tab", { name: /agents/i })).toHaveAttribute("aria-selected", "true");
  });
});
