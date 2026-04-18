/** Tests for KanbanBoard — correct columns, cards in correct columns. */

import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import KanbanBoard from "./KanbanBoard";
import { passthroughHandlers } from "../test/passthroughHandlers";

const STAGES = ["Applied", "Phone Screen", "Offer"];

const APPS = [
  {
    id: "app1",
    company: "Alpha Inc",
    role_title: "Frontend Engineer",
    current_stage: "Applied",
    date_applied: "2026-03-01",
    updated_at: "2026-04-01T00:00:00Z",
    source: "manual",
  },
  {
    id: "app2",
    company: "Beta Corp",
    role_title: "Backend Dev",
    current_stage: "Phone Screen",
    date_applied: "2026-02-15",
    updated_at: "2026-04-01T00:00:00Z",
    source: "extension",
  },
  {
    id: "app3",
    company: "Gamma LLC",
    role_title: "Full Stack",
    current_stage: "Applied",
    date_applied: "2026-03-10",
    updated_at: "2026-04-01T00:00:00Z",
    source: "manual",
  },
];

const server = setupServer(
  http.get("/api/applications", () =>
    HttpResponse.json({ data: APPS, meta: { count: APPS.length, next_cursor: null } })
  ),
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "user@example.com",
        display_name: "Test User",
        default_stages: STAGES,
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
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Returns the desktop kanban container after auth + data have loaded. */
async function renderAndGetDesktop() {
  render(<KanbanBoard filters={{}} onSelect={() => {}} />, { wrapper: makeWrapper() });
  // Wait for loading to finish (desktop div appears after isLoading becomes false)
  const desktop = await screen.findByTestId("kanban-desktop");
  // Wait for card data to appear within the desktop container
  await within(desktop).findByText("Alpha Inc");
  return desktop;
}

describe("KanbanBoard", () => {
  it("should render one column per stage from user default_stages", async () => {
    // Arrange / Act
    const desktop = await renderAndGetDesktop();

    // Assert — check column labels within the desktop container
    expect(within(desktop).getByLabelText("Applied column")).toBeInTheDocument();
    expect(within(desktop).getByLabelText("Phone Screen column")).toBeInTheDocument();
    expect(within(desktop).getByLabelText("Offer column")).toBeInTheDocument();
    expect(within(desktop).queryByLabelText("Rejected column")).not.toBeInTheDocument();
  });

  it("should render cards in the correct column by current_stage", async () => {
    // Arrange / Act
    const desktop = await renderAndGetDesktop();

    // Assert — cards in correct columns
    const appliedColumn = within(desktop).getByTestId("kanban-column-Applied");
    const phoneColumn = within(desktop).getByTestId("kanban-column-Phone Screen");

    expect(appliedColumn).toHaveTextContent("Alpha Inc");
    expect(appliedColumn).toHaveTextContent("Gamma LLC");
    expect(phoneColumn).toHaveTextContent("Beta Corp");
    expect(phoneColumn).not.toHaveTextContent("Alpha Inc");
  });

  it("should show empty placeholder for columns with no cards", async () => {
    // Arrange / Act
    const desktop = await renderAndGetDesktop();

    // Assert — Offer column has no cards
    const offerColumn = within(desktop).getByTestId("kanban-column-Offer");
    expect(offerColumn).toHaveTextContent("No applications");
  });

  it("should show the correct card count badge per column", async () => {
    // Arrange / Act
    const desktop = await renderAndGetDesktop();

    // Assert — Applied has 2 apps
    const appliedColumn = within(desktop).getByTestId("kanban-column-Applied");
    expect(appliedColumn).toHaveTextContent("2");
  });
});
