/** Tests for NotesEditor — edit/view toggle, character counter, save/cancel, error handling, onDirtyChange. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

let mockMutate;

vi.mock("../hooks/useApplications", () => ({
  useUpdateApplication: vi.fn(() => ({ mutate: mockMutate })),
}));

import NotesEditor from "./NotesEditor";
import { NOTES_MAX_LENGTH } from "../lib/constants";

const AMBER_THRESHOLD = Math.ceil(NOTES_MAX_LENGTH * 0.8);

function renderEditor(props = {}) {
  return render(
    <NotesEditor applicationId="app1" initialValue="" onDirtyChange={vi.fn()} {...props} />
  );
}

function getTextarea() {
  return screen.getByTestId("markdown-write-textarea");
}

beforeEach(() => {
  mockMutate = vi.fn();
});

describe("NotesEditor — view mode", () => {
  it("should render notes display in view mode by default", () => {
    renderEditor({ initialValue: "My notes" });

    expect(screen.getByTestId("notes-display")).toBeInTheDocument();
    expect(screen.getByTestId("notes-display")).toHaveTextContent("My notes");
  });

  it("should show placeholder text when no notes exist", () => {
    renderEditor({ initialValue: "" });

    expect(screen.getByTestId("notes-display")).toHaveTextContent("No notes yet.");
  });

  it("should show edit button in view mode", () => {
    renderEditor();

    expect(screen.getByRole("button", { name: /edit notes/i })).toBeInTheDocument();
  });

  it("should not show textarea in view mode", () => {
    renderEditor();

    expect(screen.queryByTestId("markdown-write-textarea")).not.toBeInTheDocument();
  });
});

describe("NotesEditor — edit mode toggle", () => {
  it("should enter edit mode when edit button is clicked", async () => {
    renderEditor({ initialValue: "Hello" });

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));

    expect(getTextarea()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should exit edit mode and revert on cancel", async () => {
    renderEditor({ initialValue: "Original" });

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));
    await userEvent.clear(getTextarea());
    await userEvent.type(getTextarea(), "Changed");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByTestId("markdown-write-textarea")).not.toBeInTheDocument();
    expect(screen.getByTestId("notes-display")).toHaveTextContent("Original");
  });
});

describe("NotesEditor — character counter", () => {
  it("should show character count in gray below 80% of limit", async () => {
    renderEditor();

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));

    const counter = screen.getByText(new RegExp(`0/${NOTES_MAX_LENGTH}`));
    expect(counter).toHaveClass("text-muted-foreground");
  });

  it("should show character count in amber at 80% of limit", async () => {
    renderEditor();

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));
    fireEvent.change(getTextarea(), { target: { value: "a".repeat(AMBER_THRESHOLD) } });

    const counter = screen.getByText(new RegExp(`${AMBER_THRESHOLD}/${NOTES_MAX_LENGTH}`));
    expect(counter).toHaveClass("text-amber-600");
  });

  it("should show character count in red at 100% of limit", async () => {
    renderEditor();

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));
    fireEvent.change(getTextarea(), { target: { value: "a".repeat(NOTES_MAX_LENGTH) } });

    const counter = screen.getByText(new RegExp(`${NOTES_MAX_LENGTH}/${NOTES_MAX_LENGTH}`));
    expect(counter).toHaveClass("text-destructive");
  });
});

describe("NotesEditor — save flow", () => {
  it("should call updateApp mutation with trimmed notes on save", async () => {
    mockMutate = vi.fn((_args, { onSuccess }) => onSuccess());
    renderEditor({ initialValue: "Old notes" });

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));
    await userEvent.clear(getTextarea());
    await userEvent.type(getTextarea(), "New content");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { id: "app1", body: { notes: "New content" } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("should exit edit mode after successful save", async () => {
    mockMutate = vi.fn((_args, { onSuccess }) => onSuccess());
    renderEditor({ initialValue: "Old" });

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.queryByTestId("markdown-write-textarea")).not.toBeInTheDocument();
  });

  it("should update displayed notes after successful save", async () => {
    mockMutate = vi.fn((_args, { onSuccess }) => onSuccess());
    renderEditor({ initialValue: "Old" });

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));
    await userEvent.clear(getTextarea());
    await userEvent.type(getTextarea(), "Updated notes");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByTestId("notes-display")).toHaveTextContent("Updated notes");
  });
});

describe("NotesEditor — error handling", () => {
  it("should show error message when save fails", async () => {
    mockMutate = vi.fn((_args, { onError }) => onError());
    renderEditor({ initialValue: "Old" });

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/failed to save/i);
  });

  it("should keep edit mode open after save error (allowing retry)", async () => {
    mockMutate = vi.fn((_args, { onError }) => onError());
    renderEditor({ initialValue: "Old" });

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // User stays in edit mode — Save/Cancel still visible, not the edit pencil
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit notes/i })).not.toBeInTheDocument();
  });

  it("should clear error message when cancelling after save error", async () => {
    mockMutate = vi.fn((_args, { onError }) => onError());
    renderEditor({ initialValue: "Old" });

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("NotesEditor — onDirtyChange", () => {
  it("should invoke onDirtyChange(true) when draft differs from savedValue in edit mode", async () => {
    const onDirtyChange = vi.fn();
    renderEditor({ initialValue: "Original", onDirtyChange });

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));
    fireEvent.change(getTextarea(), { target: { value: "Different" } });

    await waitFor(() => {
      expect(onDirtyChange).toHaveBeenCalledWith(true);
    });
  });

  it("should invoke onDirtyChange(false) after cancel", async () => {
    const onDirtyChange = vi.fn();
    renderEditor({ initialValue: "Original", onDirtyChange });

    await userEvent.click(screen.getByRole("button", { name: /edit notes/i }));
    fireEvent.change(getTextarea(), { target: { value: "Changed" } });
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      const calls = onDirtyChange.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(false);
    });
  });
});
