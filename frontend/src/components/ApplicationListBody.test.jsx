/** Tests for ApplicationListBody — modals, bulk action bar, undo toast, merge dialog. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

vi.mock("react-window", () => ({
  FixedSizeList: ({ children: RowRenderer, itemCount, itemData }) => (
    <div data-testid="fixed-size-list">
      {Array.from({ length: itemCount }, (_, i) =>
        <RowRenderer key={i} index={i} style={{}} data={itemData} />
      )}
    </div>
  ),
}));

import { ApplicationListBody } from "./ApplicationListBody";

const MOCK_ME = {
  id: "user1",
  email: "t@t.com",
  display_name: "T",
  has_resume: false,
  weekly_goal: 5,
  default_stages: ["Applied", "Phone Screen", "Offer"],
  email_verified: true,
};

const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json({ data: MOCK_ME })),
  http.get("/api/notifications/unread-count", () => HttpResponse.json({ data: { count: 0 } })),
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderApp(node) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <MemoryRouter>{node}</MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

const MOCK_APP = {
  id: "app1",
  company: "Acme",
  role: "SWE",
  status: "Applied",
  created_at: new Date().toISOString(),
  archived: false,
};

function makeProps(overrides = {}) {
  return {
    d: {
      applications: [MOCK_APP],
      isFetching: false,
      isLoading: false,
      sortBy: "created_at",
      sortOrder: -1,
      selectedIds: new Set(),
      focusedIdx: -1,
      windowHeight: 800,
      listRef: { current: null },
      bulkDeletePending: false,
      setBulkDeletePending: vi.fn(),
      mergeDialogOpen: false,
      setMergeDialogOpen: vi.fn(),
      undoAction: null,
      setUndoAction: vi.fn(),
      bulkDeleteMutation: { isPending: false },
      bulkStageMutation: { isPending: false },
      mergeMutation: { isPending: false },
      bulkEditMutation: { isPending: false },
      ...overrides,
    },
    rowActions: {
      handleSort: vi.fn(),
      handleArchive: vi.fn(),
      handleUnarchive: vi.fn(),
      handleDelete: vi.fn(),
      handleUndo: vi.fn(),
    },
    bulkActions: {
      handleToggle: vi.fn(),
      handleSelectAll: vi.fn(),
      handleBulkDeleteConfirm: vi.fn(),
      handleBulkMoveToStage: vi.fn(),
      handleBulkEdit: vi.fn(),
      handleMergeConfirm: vi.fn(),
    },
    onSelect: vi.fn(),
  };
}

describe("ApplicationListBody", () => {
  it("should render the virtualized list when applications are provided", () => {
    const props = makeProps();
    renderApp(<ApplicationListBody {...props} />);

    expect(screen.getByTestId("fixed-size-list")).toBeInTheDocument();
  });

  it("should show BulkActionBar when selectedIds has items", () => {
    const props = makeProps({ selectedIds: new Set(["app1"]) });
    renderApp(<ApplicationListBody {...props} />);

    expect(screen.getByRole("toolbar", { name: /bulk actions/i })).toBeInTheDocument();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  it("should not show BulkActionBar when no items are selected", () => {
    const props = makeProps({ selectedIds: new Set() });
    renderApp(<ApplicationListBody {...props} />);

    expect(screen.queryByRole("toolbar", { name: /bulk actions/i })).not.toBeInTheDocument();
  });

  it("should render UndoToast with delete message when undoAction type is delete", () => {
    const props = makeProps({ undoAction: { type: "delete", id: "app1" } });
    renderApp(<ApplicationListBody {...props} />);

    expect(screen.getByTestId("undo-toast")).toBeInTheDocument();
    expect(screen.getByText("Application deleted.")).toBeInTheDocument();
  });

  it("should render UndoToast with archive message when undoAction type is archive", () => {
    const props = makeProps({ undoAction: { type: "archive", id: "app1" } });
    renderApp(<ApplicationListBody {...props} />);

    expect(screen.getByTestId("undo-toast")).toBeInTheDocument();
    expect(screen.getByText("Application archived.")).toBeInTheDocument();
  });

  it("should render BulkDeleteConfirmModal when bulkDeletePending is true", () => {
    const props = makeProps({ bulkDeletePending: true, selectedIds: new Set(["app1"]) });
    renderApp(<ApplicationListBody {...props} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText(/delete 1 application/i).length).toBeGreaterThanOrEqual(1);
  });

  it("should call setBulkDeletePending(false) when cancel is clicked in BulkDeleteConfirmModal", async () => {
    const setBulkDeletePending = vi.fn();
    const props = makeProps({ bulkDeletePending: true, selectedIds: new Set(["app1"]), setBulkDeletePending });
    renderApp(<ApplicationListBody {...props} />);

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(setBulkDeletePending).toHaveBeenCalledWith(false);
  });
});
