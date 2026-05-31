/** Tests for useApplicationListBulkActions: merge guard. */

import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { toast } from "sonner";

import { useApplicationListBulkActions } from "./useApplicationListBulkActions";

vi.mock("sonner");

describe("useApplicationListBulkActions", () => {
  it("prevents merge when selectedIds.size !== 2", () => {
    const mockMergeMutation = { mutate: vi.fn() };
    const selectedIds = new Set(["app1"]); // Only 1 selected

    const { result } = renderHook(() =>
      useApplicationListBulkActions({
        mergeMutation: mockMergeMutation,
        selectedIds,
        setSelectedIds: vi.fn(),
        setMergeDialogOpen: vi.fn(),
      })
    );

    result.current.handleMergeConfirm({ id1: "app1", id2: "app2" });

    expect(toast.error).toHaveBeenCalledWith("Select exactly 2 applications to merge");
    expect(mockMergeMutation.mutate).not.toHaveBeenCalled();
  });

  it("allows merge when selectedIds.size === 2", () => {
    const mockMergeMutation = { mutate: vi.fn() };
    const selectedIds = new Set(["app1", "app2"]);

    const { result } = renderHook(() =>
      useApplicationListBulkActions({
        mergeMutation: mockMergeMutation,
        selectedIds,
        setSelectedIds: vi.fn(),
        setMergeDialogOpen: vi.fn(),
      })
    );

    result.current.handleMergeConfirm({ id1: "app1", id2: "app2" });

    expect(mockMergeMutation.mutate).toHaveBeenCalled();
  });
});
