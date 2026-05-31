/** Tests for ApplicationRowActions — BulkActionBar and BulkDeleteConfirmModal. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { TooltipProvider } from "./ui/tooltip";
import { BulkActionBar, BulkDeleteConfirmModal } from "./ApplicationRowActions";

const MOCK_ME = {
  id: "user1",
  email: "t@t.com",
  display_name: "T",
  has_resume: false,
  weekly_goal: 5,
  default_stages: ["Applied", "Phone Screen"],
  email_verified: true,
};

const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json({ data: MOCK_ME })),
  http.get("/api/notifications/unread-count", () => HttpResponse.json({ data: { count: 0 } })),
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrap(node) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <TooltipProvider>{node}</TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("BulkActionBar", () => {
  it("should display the selected count", () => {
    wrap(
      <BulkActionBar
        selectedCount={3}
        onMoveToStage={vi.fn()}
        onDeleteSelected={vi.fn()}
        onMerge={vi.fn()}
        onBulkEdit={vi.fn()}
      />
    );

    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("should render Delete selected button", () => {
    wrap(
      <BulkActionBar
        selectedCount={1}
        onMoveToStage={vi.fn()}
        onDeleteSelected={vi.fn()}
        onMerge={vi.fn()}
        onBulkEdit={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /delete selected/i })).toBeInTheDocument();
  });

  it("should call onDeleteSelected when Delete selected is clicked", async () => {
    const onDeleteSelected = vi.fn();
    wrap(
      <BulkActionBar
        selectedCount={2}
        onMoveToStage={vi.fn()}
        onDeleteSelected={onDeleteSelected}
        onMerge={vi.fn()}
        onBulkEdit={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /delete selected/i }));

    expect(onDeleteSelected).toHaveBeenCalledOnce();
  });

  it("should render Merge button enabled when exactly 2 items selected", () => {
    wrap(
      <BulkActionBar
        selectedCount={2}
        onMoveToStage={vi.fn()}
        onDeleteSelected={vi.fn()}
        onMerge={vi.fn()}
        onBulkEdit={vi.fn()}
      />
    );

    const mergeBtn = screen.getByRole("button", { name: /^merge$/i });
    expect(mergeBtn).toBeInTheDocument();
    expect(mergeBtn).not.toBeDisabled();
  });

  it("should render Merge button disabled when 1 item selected", () => {
    wrap(
      <BulkActionBar
        selectedCount={1}
        onMoveToStage={vi.fn()}
        onDeleteSelected={vi.fn()}
        onMerge={vi.fn()}
        onBulkEdit={vi.fn()}
      />
    );

    const mergeBtn = screen.getByRole("button", { name: /^merge$/i });
    expect(mergeBtn).toBeDisabled();
  });

  it("should render Merge button disabled when 3+ items selected", () => {
    wrap(
      <BulkActionBar
        selectedCount={5}
        onMoveToStage={vi.fn()}
        onDeleteSelected={vi.fn()}
        onMerge={vi.fn()}
        onBulkEdit={vi.fn()}
      />
    );

    const mergeBtn = screen.getByRole("button", { name: /^merge$/i });
    expect(mergeBtn).toBeDisabled();
  });

  it("should call onMerge when Merge button is clicked with exactly 2 selected", async () => {
    const onMerge = vi.fn();
    wrap(
      <BulkActionBar
        selectedCount={2}
        onMoveToStage={vi.fn()}
        onDeleteSelected={vi.fn()}
        onMerge={onMerge}
        onBulkEdit={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /^merge$/i }));
    expect(onMerge).toHaveBeenCalledOnce();
  });

  it("should display 'Change stage' button with clear label", () => {
    wrap(
      <BulkActionBar
        selectedCount={2}
        onMoveToStage={vi.fn()}
        onDeleteSelected={vi.fn()}
        onMerge={vi.fn()}
        onBulkEdit={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /change stage/i })).toBeInTheDocument();
  });

  it("should display 'Save changes' button for bulk edit", () => {
    wrap(
      <BulkActionBar
        selectedCount={2}
        onMoveToStage={vi.fn()}
        onDeleteSelected={vi.fn()}
        onMerge={vi.fn()}
        onBulkEdit={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});

describe("BulkDeleteConfirmModal", () => {
  it("should render dialog with correct application count", () => {
    render(
      <BulkDeleteConfirmModal count={3} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/delete 3 applications\?/i)).toBeInTheDocument();
  });

  it("should call onConfirm when Delete button is clicked", async () => {
    const onConfirm = vi.fn();
    render(
      <BulkDeleteConfirmModal count={2} onConfirm={onConfirm} onCancel={vi.fn()} />
    );

    await userEvent.click(screen.getByRole("button", { name: /delete 2/i }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("should call onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    render(
      <BulkDeleteConfirmModal count={1} onConfirm={vi.fn()} onCancel={onCancel} />
    );

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("should call onCancel when Escape key is pressed", async () => {
    const onCancel = vi.fn();
    render(
      <BulkDeleteConfirmModal count={1} onConfirm={vi.fn()} onCancel={onCancel} />
    );

    await userEvent.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
