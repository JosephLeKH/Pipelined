import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Tags from "./Tags";

vi.mock("../hooks/useApplications", () => ({
  useTags: vi.fn(),
  useRenameTag: vi.fn(),
  useDeleteTag: vi.fn(),
}));

import { useTags, useRenameTag, useDeleteTag } from "../hooks/useApplications";

const MOCK_TAGS = [
  { name: "frontend", count: 5 },
  { name: "backend", count: 3 },
];

const mockRefetch = vi.fn();
const mockRename = vi.fn();
const mockDelete = vi.fn();

function renderPage() {
  return render(<Tags />);
}

describe("Tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRenameTag.mockReturnValue({ mutate: mockRename, error: null });
    useDeleteTag.mockReturnValue({ mutate: mockDelete, error: null, isPending: false });
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

  it("should render tags table with name, count, and action buttons", () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("backend")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rename tag frontend/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete tag frontend/i })).toBeInTheDocument();
  });

  it("should show inline editor when rename button is clicked", () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /rename tag frontend/i }));

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("frontend");
  });

  it("should open delete confirm modal when delete button is clicked", () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /delete tag frontend/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/delete tag/i)).toBeInTheDocument();
  });

  it("should call deleteTag mutation when modal confirm is clicked", () => {
    useTags.mockReturnValue({ data: { tags: MOCK_TAGS }, isLoading: false, error: null, refetch: mockRefetch });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /delete tag frontend/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(mockDelete).toHaveBeenCalledWith("frontend", expect.any(Object));
  });
});
