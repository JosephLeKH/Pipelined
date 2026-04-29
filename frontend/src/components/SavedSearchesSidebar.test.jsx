import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SavedSearchesSidebar from "./SavedSearchesSidebar";

vi.mock("../hooks/useSavedSearches", () => ({
  useSavedSearches: vi.fn(),
  useDeleteSavedSearch: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useSavedSearches, useDeleteSavedSearch } from "../hooks/useSavedSearches";

const SEARCHES_FIXTURE = [
  { id: "s1", name: "SWE Intern Remote", query: "engineer", new_matches_count: 3 },
  { id: "s2", name: "PM Roles", query: "", new_matches_count: 0 },
];

describe("SavedSearchesSidebar", () => {
  let mockDeleteMutate;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteMutate = vi.fn();
    useSavedSearches.mockReturnValue({ data: SEARCHES_FIXTURE });
    useDeleteSavedSearch.mockReturnValue({ mutate: mockDeleteMutate });
  });

  it("should return null when searches list is empty", () => {
    useSavedSearches.mockReturnValue({ data: [] });

    const { container } = render(<SavedSearchesSidebar onApply={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should render saved search names", () => {
    render(<SavedSearchesSidebar onApply={vi.fn()} />);

    expect(screen.getByText("SWE Intern Remote")).toBeInTheDocument();
    expect(screen.getByText("PM Roles")).toBeInTheDocument();
  });

  it("should show new_matches_count badge when count is greater than 0", () => {
    render(<SavedSearchesSidebar onApply={vi.fn()} />);

    expect(screen.getByRole("generic", { name: /3 new matches/i })).toBeInTheDocument();
  });

  it("should call onApply with the search object when a list item is clicked", () => {
    const onApply = vi.fn();

    render(<SavedSearchesSidebar onApply={onApply} />);
    fireEvent.click(screen.getByText("SWE Intern Remote"));

    expect(onApply).toHaveBeenCalledWith(SEARCHES_FIXTURE[0]);
  });

  it("should call deleteMutation.mutate with the search id on delete click", () => {
    render(<SavedSearchesSidebar onApply={vi.fn()} />);

    const deleteButtons = screen.getAllByRole("button", { name: /delete saved search/i });
    fireEvent.click(deleteButtons[0]);

    expect(mockDeleteMutate).toHaveBeenCalledWith("s1", expect.any(Object));
  });
});
