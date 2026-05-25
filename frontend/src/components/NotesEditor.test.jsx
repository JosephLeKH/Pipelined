/** Tests for NotesEditor — blur autosave, save status microcopy, character counter, onDirtyChange. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

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

function blurEditor() {
  fireEvent.blur(getTextarea());
}

beforeEach(() => {
  mockMutate = vi.fn();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-05-25T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("NotesEditor — always-visible editor", () => {
  it("should render markdown editor by default without save button", () => {
    renderEditor({ initialValue: "My notes" });

    expect(getTextarea()).toBeInTheDocument();
    expect(getTextarea()).toHaveValue("My notes");
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit notes/i })).not.toBeInTheDocument();
  });
});

describe("NotesEditor — blur autosave", () => {
  it("should call updateApp with trimmed notes on blur when draft changed", async () => {
    mockMutate = vi.fn((_args, { onSuccess }) => onSuccess());
    renderEditor({ initialValue: "Old notes" });

    await userEvent.clear(getTextarea());
    await userEvent.type(getTextarea(), "New content");
    blurEditor();

    expect(mockMutate).toHaveBeenCalledWith(
      { id: "app1", body: { notes: "New content" } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("should not call updateApp on blur when draft unchanged", async () => {
    renderEditor({ initialValue: "Same" });

    fireEvent.focus(getTextarea());
    blurEditor();

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("should show Saving… then Saved microcopy after successful blur save", async () => {
    mockMutate = vi.fn((_args, { onSuccess }) => {
      setTimeout(onSuccess, 10);
    });
    renderEditor({ initialValue: "" });

    await userEvent.type(getTextarea(), "Updated");
    blurEditor();

    expect(screen.getByText("Saving…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("notes-save-status")).toHaveTextContent(/Saved · just now/);
    });
  });

  it("should update saved microcopy after elapsed seconds", async () => {
    mockMutate = vi.fn((_args, { onSuccess }) => onSuccess());
    renderEditor({ initialValue: "" });

    await userEvent.type(getTextarea(), "Note");
    blurEditor();

    await waitFor(() => {
      expect(screen.getByTestId("notes-save-status")).toBeInTheDocument();
    });

    vi.advanceTimersByTime(7000);

    await waitFor(() => {
      expect(screen.getByTestId("notes-save-status")).toHaveTextContent(/Saved · 7 s ago/);
    });
  });
});

describe("NotesEditor — character counter", () => {
  it("should show character count in text-text-3 below 80% of limit", () => {
    renderEditor();

    const counter = screen.getByText(new RegExp(`0/${NOTES_MAX_LENGTH}`));
    expect(counter).toHaveClass("text-text-3");
  });

  it("should show character count in amber at 80% of limit", () => {
    renderEditor();

    fireEvent.change(getTextarea(), { target: { value: "a".repeat(AMBER_THRESHOLD) } });

    const counter = screen.getByText(new RegExp(`${AMBER_THRESHOLD}/${NOTES_MAX_LENGTH}`));
    expect(counter).toHaveClass("text-amber-600");
  });

  it("should show character count in brand red at 100% of limit", () => {
    renderEditor();

    fireEvent.change(getTextarea(), { target: { value: "a".repeat(NOTES_MAX_LENGTH) } });

    const counter = screen.getByText(new RegExp(`${NOTES_MAX_LENGTH}/${NOTES_MAX_LENGTH}`));
    expect(counter).toHaveClass("text-brand-700");
  });
});

describe("NotesEditor — error handling", () => {
  it("should show error message when blur save fails", async () => {
    mockMutate = vi.fn((_args, { onError }) => onError());
    renderEditor({ initialValue: "Old" });

    await userEvent.clear(getTextarea());
    await userEvent.type(getTextarea(), "Changed");
    blurEditor();

    expect(screen.getByRole("alert")).toHaveTextContent(/failed to save/i);
  });

  it("should keep draft content after save error for retry on next blur", async () => {
    mockMutate = vi.fn((_args, { onError }) => onError());
    renderEditor({ initialValue: "Old" });

    await userEvent.clear(getTextarea());
    await userEvent.type(getTextarea(), "Retry me");
    blurEditor();

    expect(getTextarea()).toHaveValue("Retry me");
  });
});

describe("NotesEditor — onDirtyChange", () => {
  it("should invoke onDirtyChange(true) when draft differs from savedValue", async () => {
    const onDirtyChange = vi.fn();
    renderEditor({ initialValue: "Original", onDirtyChange });

    fireEvent.change(getTextarea(), { target: { value: "Different" } });

    await waitFor(() => {
      expect(onDirtyChange).toHaveBeenCalledWith(true);
    });
  });

  it("should invoke onDirtyChange(false) after successful blur save", async () => {
    const onDirtyChange = vi.fn();
    mockMutate = vi.fn((_args, { onSuccess }) => onSuccess());
    renderEditor({ initialValue: "Original", onDirtyChange });

    fireEvent.change(getTextarea(), { target: { value: "Saved draft" } });
    blurEditor();

    await waitFor(() => {
      const calls = onDirtyChange.mock.calls;
      expect(calls[calls.length - 1][0]).toBe(false);
    });
  });
});
