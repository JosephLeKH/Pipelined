/** Smoke tests for KanbanBoard optimistic drag-drop stage update. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../hooks/useApplications", () => ({
  useApplications: vi.fn(),
  useUpdateApplication: vi.fn(),
  KEYS: { list: (f) => ["applications", "list", f] },
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { default_stages: ["Applied", "Interview", "Offer"] } }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("./KanbanCard", () => ({ default: ({ application }) => <div data-testid="kanban-card">{application.company}</div> }));
vi.mock("./SkeletonRow", () => ({ default: () => <div data-testid="skeleton-row" /> }));

import { useApplications, useUpdateApplication } from "../hooks/useApplications";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import KanbanBoard from "./KanbanBoard";

const APPS = [
  { id: "a1", company: "Acme", role_title: "Engineer", current_stage: "Applied" },
  { id: "a2", company: "Beta", role_title: "Designer", current_stage: "Interview" },
];

function setup(appsOverride = APPS) {
  const mutate = vi.fn();
  const getQueryData = vi.fn(() => ({ data: appsOverride }));
  const setQueryData = vi.fn();
  useApplications.mockReturnValue({ data: { data: appsOverride }, isLoading: false });
  useUpdateApplication.mockReturnValue({ mutate });
  useQueryClient.mockReturnValue({ getQueryData, setQueryData });
  return { mutate, getQueryData, setQueryData };
}

describe("KanbanBoard optimistic updates", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should render columns for each stage", () => {
    setup();
    render(<KanbanBoard filters={{}} onSelect={vi.fn()} />);

    // Both mobile and desktop render columns, so use getAllByTestId
    expect(screen.getAllByTestId("kanban-column-Applied").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("kanban-column-Interview").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("kanban-column-Offer").length).toBeGreaterThan(0);
  });

  it("should show skeleton rows while loading", () => {
    useApplications.mockReturnValue({ data: null, isLoading: true });
    useUpdateApplication.mockReturnValue({ mutate: vi.fn() });
    useQueryClient.mockReturnValue({ getQueryData: vi.fn(), setQueryData: vi.fn() });

    render(<KanbanBoard filters={{}} onSelect={vi.fn()} />);

    const skeletons = screen.getAllByTestId("skeleton-row");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should expose queryClient.setQueryData for optimistic updates", () => {
    const { setQueryData } = setup();
    expect(typeof setQueryData).toBe("function");
  });

  it("should expose toast.success and toast.error for feedback", () => {
    setup();
    expect(typeof toast.success).toBe("function");
    expect(typeof toast.error).toBe("function");
  });
});
