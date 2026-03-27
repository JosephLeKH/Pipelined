/** Tests for DetailPanel — field display, notes blur, stage change, close on Escape/click-outside. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";

import DetailPanel from "./DetailPanel";

const APP = {
  id: "app1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Applied",
  date_applied: "2026-01-15T00:00:00Z",
  updated_at: "2026-03-20T00:00:00Z",
  source: "manual",
  source_url: "https://example.com/job/123",
  location: "San Francisco, CA",
  remote_status: "hybrid",
  compensation: "$150k",
  company_type: "startup",
  notes: "Great company!",
  stage_history: [
    { stage: "Applied", transitioned_at: "2026-01-15T00:00:00Z" },
    { stage: "Phone Screen", transitioned_at: "2026-01-20T00:00:00Z" },
  ],
};

const server = setupServer(
  http.patch("/api/applications/:id", () => HttpResponse.json({ data: APP })),
  http.get("/api/calendar/events", () => HttpResponse.json({ data: [], meta: { count: 0 } }))
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("DetailPanel", () => {
  it("should display role_title and company when application is provided", () => {
    // Arrange / Act
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("should display location, remote_status, compensation, and company_type fields", () => {
    // Arrange / Act
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    expect(screen.getByText("San Francisco, CA")).toBeInTheDocument();
    expect(screen.getByText("hybrid")).toBeInTheDocument();
    expect(screen.getByText("$150k")).toBeInTheDocument();
    expect(screen.getByText("startup")).toBeInTheDocument();
  });

  it("should render a link to source_url labeled 'Job posting'", () => {
    // Arrange / Act
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    const link = screen.getByRole("link", { name: /job posting/i });
    expect(link).toHaveAttribute("href", "https://example.com/job/123");
  });

  it("should call PATCH on notes blur", async () => {
    // Arrange
    let patchCalled = false;
    server.use(
      http.patch("/api/applications/:id", () => {
        patchCalled = true;
        return HttpResponse.json({ data: APP });
      })
    );
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Act
    const textarea = screen.getByRole("textbox", { name: /notes/i });
    fireEvent.blur(textarea);

    // Assert
    await waitFor(() => expect(patchCalled).toBe(true));
  });

  it("should call PATCH with new stage on stage select change", async () => {
    // Arrange
    let patchBody = null;
    server.use(
      http.patch("/api/applications/:id", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ data: APP });
      })
    );
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Act
    const select = screen.getByRole("combobox", { name: /stage/i });
    await userEvent.selectOptions(select, "Phone Screen");

    // Assert
    await waitFor(() => expect(patchBody).toEqual({ current_stage: "Phone Screen" }));
  });

  it("should render stage history entries in order", () => {
    // Arrange / Act
    render(<DetailPanel application={APP} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    const history = screen.getByTestId("stage-history");
    const items = history.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Applied");
    expect(items[1]).toHaveTextContent("Phone Screen");
  });

  it("should call onClose when close button is clicked", async () => {
    // Arrange
    const onClose = vi.fn();
    render(<DetailPanel application={APP} onClose={onClose} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.click(screen.getByRole("button", { name: /close panel/i }));

    // Assert
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onClose when Escape key is pressed", async () => {
    // Arrange
    const onClose = vi.fn();
    render(<DetailPanel application={APP} onClose={onClose} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.keyboard("{Escape}");

    // Assert
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onClose when clicking the overlay outside the panel", () => {
    // Arrange
    const onClose = vi.fn();
    render(<DetailPanel application={APP} onClose={onClose} />, { wrapper: makeWrapper() });

    // Act — click the overlay element directly (not the inner panel)
    const overlay = screen.getByTestId("panel-overlay");
    fireEvent.click(overlay, { target: overlay });

    // Assert
    expect(onClose).toHaveBeenCalledOnce();
  });
});
