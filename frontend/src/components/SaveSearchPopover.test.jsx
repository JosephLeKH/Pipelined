import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SaveSearchPopover from "./SaveSearchPopover";

vi.mock("../hooks/useSavedSearches", () => ({
  useCreateSavedSearch: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useCreateSavedSearch } from "../hooks/useSavedSearches";

const FILTERS_FIXTURE = { q: "engineer", role_type: "full_time" };

describe("SaveSearchPopover", () => {
  let mockMutate;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate = vi.fn();
    useCreateSavedSearch.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it("should render dialog with correct aria-label", () => {
    render(<SaveSearchPopover currentFilters={FILTERS_FIXTURE} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: /name this search/i })).toBeInTheDocument();
  });

  it("should disable Save button when name is empty", () => {
    render(<SaveSearchPopover currentFilters={FILTERS_FIXTURE} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("should call mutate with trimmed name and filters on Save click", () => {
    render(<SaveSearchPopover currentFilters={FILTERS_FIXTURE} onClose={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: /saved search name/i }), {
      target: { value: "  SWE Remote  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { name: "SWE Remote", query: "engineer", filters: { role_type: "full_time" } },
      expect.any(Object)
    );
  });

  it("should call onClose when Cancel is clicked", () => {
    const onClose = vi.fn();

    render(<SaveSearchPopover currentFilters={FILTERS_FIXTURE} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should enforce max name length of 100 characters", () => {
    render(<SaveSearchPopover currentFilters={FILTERS_FIXTURE} onClose={vi.fn()} />);

    const longName = "x".repeat(150);
    const input = screen.getByRole("textbox", { name: /saved search name/i });
    fireEvent.change(input, { target: { value: longName } });

    expect(input.value).toHaveLength(100);
  });
});
