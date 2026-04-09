/** Tests for UndoToast — renders message/undo button, fires callbacks, auto-dismisses. */

import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import UndoToast from "./UndoToast";

describe("UndoToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderToast(props = {}) {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    render(
      <UndoToast
        message="Application deleted."
        onUndo={onUndo}
        onDismiss={onDismiss}
        duration={5000}
        {...props}
      />
    );
    return { onUndo, onDismiss };
  }

  it("should render the message and Undo button", () => {
    renderToast();

    expect(screen.getByText("Application deleted.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
  });

  it("should call onUndo when Undo is clicked", () => {
    const { onUndo } = renderToast();

    fireEvent.click(screen.getByRole("button", { name: /undo/i }));

    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("should call onDismiss after the duration expires", () => {
    const { onDismiss } = renderToast({ duration: 5000 });

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(5000); });

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("should not call onDismiss before the duration expires", () => {
    const { onDismiss } = renderToast({ duration: 5000 });

    act(() => { vi.advanceTimersByTime(4999); });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("should render progress bar", () => {
    renderToast();

    expect(screen.getByTestId("undo-progress-bar")).toBeInTheDocument();
  });

  it("should render with aria-live region for accessibility", () => {
    renderToast();

    const toast = screen.getByTestId("undo-toast");
    expect(toast).toHaveAttribute("aria-live", "polite");
  });
});
