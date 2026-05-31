import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import Tags from "./Tags";

vi.mock("sonner");

vi.mock("../hooks/useApplications", () => ({
  useTags: vi.fn(),
  useRenameTag: vi.fn(),
  useDeleteTag: vi.fn(),
  useApplications: vi.fn(),
}));

import {
  useTags,
  useRenameTag,
  useDeleteTag,
  useApplications,
} from "../hooks/useApplications";
import { TAG_COLOR_SWATCHES } from "../lib/constants";
import { defaultTagColor } from "../lib/tagUtils";

const MOCK_TAGS = [
  { name: "frontend", count: 5 },
  { name: "backend", count: 3 },
];

const mockRefetch = vi.fn();
const mockRename = vi.fn();
const mockDelete = vi.fn();

function renderPage() {
  return render(
    <MemoryRouter>
      <Tags />
    </MemoryRouter>,
  );
}

describe("Tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useRenameTag.mockReturnValue({ mutate: mockRename, error: null });
    useDeleteTag.mockReturnValue({ mutate: mockDelete, error: null, isPending: false });
    useApplications.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("should show loading spinner while tags are fetching", () => {
    useTags.mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: mockRefetch });

    renderPage();

    expect(document.querySelector(".animate-shimmer")).toBeInTheDocument();
  });

  it("should show fetch error state with retry button when tags load fails", () => {
    useTags.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load tags.");
    expect(screen.getByRole("button", { name: /retry loading tags/i })).toBeInTheDocument();
  });

  it("should call refetch when retry is clicked", () => {
    useTags.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /retry loading tags/i }));

    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it("should show empty state when no tags exist", () => {
    useTags.mockReturnValue({ data: { tags: [] }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    expect(screen.getByText("No tags yet")).toBeInTheDocument();
  });

  it("should render 40px tag rows with color dot and application count", () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    const rows = screen.getAllByTestId("tag-list-row");
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(row).toHaveClass("h-10"));

    const frontendRow = screen.getByText("#frontend").closest('[data-testid="tag-list-row"]');
    expect(screen.getByText("5 applications")).toBeInTheDocument();

    const dot = frontendRow?.querySelector('[aria-hidden="true"]');
    expect(dot).toHaveStyle({ backgroundColor: defaultTagColor("frontend") });
    expect(TAG_COLOR_SWATCHES).toContain(defaultTagColor("frontend"));
  });

  it("should open row menu with edit and delete actions", async () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /actions for tag frontend/i }));
    expect(screen.getByRole("menuitem", { name: /edit name/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /delete/i })).toBeInTheDocument();
  });

  it("should show inline editor when edit name is selected", async () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /actions for tag frontend/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /edit name/i }));

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("frontend");
  });

  it("should open delete confirm modal when delete is selected", async () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /actions for tag frontend/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/delete tag/i)).toBeInTheDocument();
  });

  it("should call deleteTag mutation when modal confirm is clicked", async () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /actions for tag frontend/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(mockDelete).toHaveBeenCalledWith("frontend", expect.any(Object));
  });

  it("should show success toast on delete success", async () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /actions for tag frontend/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    const call = mockDelete.mock.calls[0];
    call[1].onSuccess();

    expect(toast.success).toHaveBeenCalledWith("Tag deleted");
  });

  it("should show error toast and keep modal open on delete failure", async () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /actions for tag frontend/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }));

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    const call = mockDelete.mock.calls[0];
    const error = { response: { data: { detail: "Cannot delete tag with linked apps" } } };
    call[1].onError(error);

    expect(toast.error).toHaveBeenCalledWith("Cannot delete tag with linked apps");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should show fallback error message on delete failure with no detail", async () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /actions for tag frontend/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /^delete$/i }));

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    const call = mockDelete.mock.calls[0];
    call[1].onError({});

    expect(toast.error).toHaveBeenCalledWith("Couldn't delete tag — try again");
  });
});
