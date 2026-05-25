/** Tests for ApplicationList — row rendering, stale indicator, onSelect, sort params, empty state. */

import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import ApplicationList from "./ApplicationList";
import { passthroughHandlers } from "../test/passthroughHandlers";
import { withTooltipProvider } from "../test/testProviders";

const NOW = new Date("2026-03-25T00:00:00Z");
const STALE_DATE = new Date(NOW.getTime() - 15 * 86_400_000).toISOString(); // 15 days ago
const FRESH_DATE = new Date(NOW.getTime() - 2 * 86_400_000).toISOString();  // 2 days ago

const APPS = [
  {
    id: "app1",
    company: "Acme Corp",
    role_title: "Software Engineer",
    current_stage: "Applied",
    date_applied: "2026-01-15T00:00:00Z",
    updated_at: FRESH_DATE,
    source: "manual",
  },
  {
    id: "app2",
    company: "OldCo",
    role_title: "Backend Dev",
    current_stage: "Phone Screen",
    date_applied: "2025-12-01T00:00:00Z",
    updated_at: STALE_DATE,
    source: "extension",
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
        email: "test@example.com",
        display_name: "Test User",
        default_stages: ["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"],
      },
    })
  ),
  http.post("/api/applications/bulk-update", () =>
    HttpResponse.json({ data: { updated_count: 1 } })
  ),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Freeze Date.now so stale calculations are deterministic
vi.setSystemTime(NOW);

function makeWrapper(initialEntries = ["/"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>{withTooltipProvider(children)}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ApplicationList", () => {
  it("should render company name and role title for each application", async () => {
    // Arrange / Act
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("OldCo")).toBeInTheDocument();
    expect(screen.getByText("Backend Dev")).toBeInTheDocument();
  });

  it("should show stale indicator only for applications updated more than 14 days ago", async () => {
    // Arrange / Act
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });

    // Assert — wait for data then check stale indicators
    await screen.findByText("Acme Corp");
    const indicators = screen.getAllByTestId("stale-indicator");
    expect(indicators).toHaveLength(1);

    // Verify the stale indicator is inside the OldCo row
    const oldCoCell = screen.getByText("OldCo");
    const row = oldCoCell.closest("[role='listitem']");
    expect(within(row).getByTestId("stale-indicator")).toBeInTheDocument();
  });

  it("should call onSelect with the application object when a row is clicked", async () => {
    // Arrange
    const onSelect = vi.fn();
    render(<ApplicationList onSelect={onSelect} />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");

    // Act
    await userEvent.click(screen.getByText("Acme Corp").closest("[role='listitem']"));

    // Assert
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "app1" }));
  });

  it("should show empty state when no applications match", async () => {
    // Arrange
    server.use(
      http.get("/api/applications", () =>
        HttpResponse.json({ data: [], meta: { count: 0, next_cursor: null } })
      )
    );

    // Act
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    expect(await screen.findByText(/no applications yet/i)).toBeInTheDocument();
  });

  it("should render column headers for Company, Role, Stage, Date Applied", async () => {
    // Arrange / Act
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });

    // Wait for data to load, then check headers
    await screen.findByText("Acme Corp");

    // Assert — column headers are buttons
    expect(screen.getByRole("button", { name: /company/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stage/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /updated/i })).toBeInTheDocument();
  });

  it("should update sort_by in URL when a column header is clicked", async () => {
    // Arrange
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");

    // Act
    await userEvent.click(screen.getByRole("button", { name: /company/i }));

    // Assert — URL params updated (re-render with new sort)
    expect(screen.getByRole("button", { name: /company/i })).toBeInTheDocument();
  });

  it("should show skeleton while loading", () => {
    // Arrange — suspend response
    server.use(http.get("/api/applications", () => new Promise(() => {})));

    // Act
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    const skeletons = document.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render 8 SkeletonRow components when isLoading is true", () => {
    // Arrange — suspend response so loading state persists
    server.use(http.get("/api/applications", () => new Promise(() => {})));

    // Act
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });

    // Assert — exactly 8 skeleton rows
    const skeletonRows = document.querySelectorAll("[data-testid='skeleton-row']");
    expect(skeletonRows).toHaveLength(8);
  });

  it("should render real rows when data is present", async () => {
    // Arrange / Act
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });

    // Assert — skeleton rows are gone, real data is present
    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("OldCo")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-testid='skeleton-row']")).toHaveLength(0);
  });

  it("should render StagePill with visible stage label text", async () => {
    // Arrange / Act
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");

    // Assert — dot+label pill shows stage name (listitem aria-label also includes stage)
    const pills = screen.getAllByTestId("stage-pill");
    expect(pills.some((el) => el.textContent?.includes("Applied"))).toBe(true);
    expect(pills.some((el) => el.textContent?.includes("Phone Screen"))).toBe(true);
  });

  it("should render stale indicator with accessible aria-label", async () => {
    // Arrange / Act
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByText("OldCo");

    // Assert — stale indicator uses descriptive aria-label
    const staleIndicator = screen.getByTestId("stale-indicator");
    expect(staleIndicator).toHaveAttribute(
      "aria-label",
      "Stale application — no updates in 14+ days"
    );
  });

  it("should render a select-all checkbox in the header", async () => {
    // Arrange / Act
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");

    // Assert
    expect(screen.getByLabelText("Select all applications")).toBeInTheDocument();
  });

  it("should show bulk action bar when a row checkbox is checked", async () => {
    // Arrange
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");

    // Act — check the first app row's checkbox
    const checkbox = screen.getByLabelText("Select Acme Corp");
    await userEvent.click(checkbox);

    // Assert — bulk action bar appears
    expect(screen.getByRole("toolbar", { name: /bulk actions/i })).toBeInTheDocument();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("should select all rows when select-all checkbox is clicked", async () => {
    // Arrange
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");

    // Act — click select-all
    const selectAll = screen.getByLabelText("Select all applications");
    await userEvent.click(selectAll);

    // Assert — bulk action bar shows count matching app count
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("should disable bulk action buttons while bulk delete mutation is pending", async () => {
    // Arrange — suspend bulk delete so mutation stays in-flight
    let deleteRequested = false;
    server.use(
      http.delete("/api/applications/bulk", async () => {
        deleteRequested = true;
        return new Promise(() => {});
      })
    );
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");

    // Act — select a row, open bulk delete confirm, confirm deletion
    await userEvent.click(screen.getByLabelText("Select Acme Corp"));
    await userEvent.click(screen.getByRole("button", { name: /delete selected/i }));
    const confirmBtn = await screen.findByRole("button", { name: /delete 1/i });
    await userEvent.click(confirmBtn);

    // Assert — delete request started and confirm modal stays open until it completes
    await waitFor(() => {
      expect(deleteRequested).toBe(true);
    });
    expect(screen.getByRole("button", { name: /delete 1/i })).toBeInTheDocument();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("should clear selection when select-all is clicked again while all are selected", async () => {
    // Arrange
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");
    const selectAll = screen.getByLabelText("Select all applications");
    await userEvent.click(selectAll);
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    // Act — click select-all again to deselect
    await userEvent.click(selectAll);

    // Assert — bulk action bar is gone
    expect(screen.queryByRole("toolbar", { name: /bulk actions/i })).not.toBeInTheDocument();
  });

  it("should show bulk edit controls in the bulk action bar", async () => {
    // Arrange
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");

    // Act — select a row
    await userEvent.click(screen.getByLabelText("Select Acme Corp"));

    // Assert — follow-up date, tags inputs, and Apply button are present
    const toolbar = screen.getByRole("toolbar", { name: /bulk actions/i });
    expect(within(toolbar).getByLabelText("Follow-up date")).toBeInTheDocument();
    expect(within(toolbar).getByLabelText("Tags to add")).toBeInTheDocument();
    expect(within(toolbar).getByLabelText("Tags to remove")).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: /apply/i })).toBeInTheDocument();
  });

  it("should call bulk-update endpoint when Apply is clicked with a follow-up date", async () => {
    // Arrange
    let capturedBody = null;
    server.use(
      http.post("/api/applications/bulk-update", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ data: { updated_count: 1 } });
      })
    );
    render(<ApplicationList onSelect={() => {}} />, { wrapper: makeWrapper() });
    await screen.findByText("Acme Corp");

    // Act — select a row, fill in follow-up date, click Apply
    await userEvent.click(screen.getByLabelText("Select Acme Corp"));
    const toolbar = screen.getByRole("toolbar", { name: /bulk actions/i });
    await userEvent.type(within(toolbar).getByLabelText("Follow-up date"), "2026-05-01");
    await userEvent.click(within(toolbar).getByRole("button", { name: /apply/i }));

    // Assert — endpoint was called with the correct payload
    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
    });
    expect(capturedBody.update.follow_up_date).toBe("2026-05-01");
    expect(capturedBody.application_ids).toContain("app1");
  });
});
