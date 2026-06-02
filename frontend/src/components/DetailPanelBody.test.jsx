/** Smoke test: PanelBody renders without crash. */

import { render, screen } from "@testing-library/react";
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
  http.get("/api/calendar/events", () => HttpResponse.json({ data: [], meta: { count: 0 } }))
);

beforeAll(() => server.listen());
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

describe("PanelBody", () => {
  it("should render without crashing", () => {
    render(
      <PanelBody
        application={APP}
        handleStageChange={vi.fn()}
        handleUpdate={vi.fn()}
        onAddEvent={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
      { wrapper }
    );

    expect(screen.getByLabelText("Stage")).toBeInTheDocument();
  });
});

describe("PanelBody — Scout-first layout", () => {
  it("renders Scout's Take above Notes", () => {
    render(
      <PanelBody
        application={APP}
        handleStageChange={vi.fn()}
        handleUpdate={vi.fn()}
        onAddEvent={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
      { wrapper }
    );

    const take = screen.getByLabelText("Scout's Take");
    expect(take).toBeInTheDocument();
    // Verify Notes section exists
    const notes = screen.getByLabelText("Notes");
    expect(notes).toBeInTheDocument();
  });

  it("renders Scout's Toolkit with all six tools", () => {
    render(
      <PanelBody
        application={APP}
        handleStageChange={vi.fn()}
        handleUpdate={vi.fn()}
        onAddEvent={vi.fn()}
        onDirtyChange={vi.fn()}
      />,
      { wrapper }
    );

    const toolkit = screen.getByLabelText("Scout's Toolkit");
    expect(toolkit).toBeInTheDocument();
    // Verify all six tools are rendered
    expect(screen.getByLabelText(/Apply Pack — Run it/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mock Interview — Run it/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Resume Insights — Run it/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Recap — Run it/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Interview Prep — Run it/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Follow-up Draft — Run it/)).toBeInTheDocument();
  });
});
