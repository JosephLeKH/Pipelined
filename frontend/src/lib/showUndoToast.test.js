/** Tests for showUndoToast — sonner action button, undo/dismiss callbacks. */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockToast = vi.fn();
vi.mock("sonner", () => ({ toast: (...args) => mockToast(...args) }));

import { showUndoToast } from "./showUndoToast";
import { UNDO_TOAST_DURATION_MS } from "./constants";

describe("showUndoToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockReturnValue("toast-1");
  });

  it("should call sonner toast with message, duration, and Undo action", () => {
    showUndoToast("Application deleted.");

    expect(mockToast).toHaveBeenCalledOnce();
    expect(mockToast).toHaveBeenCalledWith(
      "Application deleted.",
      expect.objectContaining({
        duration: UNDO_TOAST_DURATION_MS,
        action: expect.objectContaining({ label: "Undo" }),
      }),
    );
  });

  it("should call onUndo when action onClick fires and skip onDismiss", () => {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    showUndoToast("Application archived.", { onUndo, onDismiss });

    const { action, onDismiss: dismissHandler } = mockToast.mock.calls[0][1];
    action.onClick();
    dismissHandler();

    expect(onUndo).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("should call onDismiss when toast dismisses without undo", () => {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    showUndoToast("Application deleted.", { onUndo, onDismiss });

    const { onDismiss: dismissHandler } = mockToast.mock.calls[0][1];
    dismissHandler();

    expect(onUndo).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("should return the toast id from sonner", () => {
    const id = showUndoToast("Deleted 2 applications.");

    expect(id).toBe("toast-1");
  });
});
