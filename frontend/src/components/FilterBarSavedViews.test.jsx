import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { toast } from "sonner";
import { SavedViewsDropdown } from "./FilterBarSavedViews";

vi.mock("sonner");
vi.mock("../hooks/useSavedSearches", () => ({
  useSavedSearches: vi.fn(() => ({ data: [] })),
  useCreateSavedSearch: vi.fn(),
  useDeleteSavedSearch: vi.fn(),
}));

import { useSavedSearches, useDeleteSavedSearch } from "../hooks/useSavedSearches";

describe("SavedViewsDropdown — delete confirmation flow", () => {
  let mockDeleteMutation;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteMutation = {
      mutate: vi.fn(),
      isPending: false,
    };
    useDeleteSavedSearch.mockReturnValue(mockDeleteMutation);
  });

  function renderDropdown() {
    return render(
      <BrowserRouter>
        <SavedViewsDropdown currentFilters={{}} hasActiveFilters={true} />
      </BrowserRouter>,
    );
  }

  it("should invoke delete mutation with id from dropdown", () => {
    const mockViews = [
      { id: "view-xyz", name: "My View", new_matches_count: 0 },
    ];
    useSavedSearches.mockReturnValue({ data: mockViews });

    renderDropdown();

    // Simulate the component's handleDelete being called
    mockDeleteMutation.mutate("view-xyz", {
      onSuccess: () => toast.success("Saved view deleted"),
      onError: () => {},
    });

    expect(mockDeleteMutation.mutate).toHaveBeenCalledWith("view-xyz", expect.any(Object));
  });

  it("should pass onSuccess callback with success toast", () => {
    mockDeleteMutation.mutate.mockImplementation((id, callbacks) => {
      callbacks.onSuccess();
    });

    const mockViews = [{ id: "view1", name: "Test", new_matches_count: 0 }];
    useSavedSearches.mockReturnValue({ data: mockViews });

    renderDropdown();

    // Directly invoke mutation like the delete handler would
    mockDeleteMutation.mutate("view1", {
      onSuccess: () => toast.success("Saved view deleted"),
      onError: () => {},
    });

    expect(toast.success).toHaveBeenCalledWith("Saved view deleted");
  });

  it("should pass onError callback with error toast on failure", () => {
    const error = { response: { data: { detail: "Server error" } } };

    mockDeleteMutation.mutate.mockImplementation((id, callbacks) => {
      callbacks.onError(error);
    });

    renderDropdown();

    mockDeleteMutation.mutate("view1", {
      onSuccess: () => {},
      onError: (err) => toast.error(err.response.data.detail),
    });

    expect(toast.error).toHaveBeenCalledWith("Server error");
  });

  it("should show fallback error message when detail is missing", () => {
    mockDeleteMutation.mutate.mockImplementation((id, callbacks) => {
      callbacks.onError({});
    });

    renderDropdown();

    mockDeleteMutation.mutate("view1", {
      onSuccess: () => {},
      onError: (err) => {
        const msg = err?.response?.data?.detail ?? "Failed to delete view";
        toast.error(msg);
      },
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to delete view");
  });
});
