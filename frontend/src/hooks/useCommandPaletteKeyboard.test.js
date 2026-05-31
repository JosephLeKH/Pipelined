/** Tests for useCommandPaletteKeyboard: text input guard. */

import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { useCommandPaletteKeyboard } from "./useCommandPaletteKeyboard";

describe("useCommandPaletteKeyboard", () => {
  it("does not toggle palette when Cmd+K pressed inside text input", () => {
    const setIsOpen = vi.fn();
    const close = vi.fn();

    const { result } = renderHook(() =>
      useCommandPaletteKeyboard({
        isOpen: false,
        setIsOpen,
        items: [],
        idx: 0,
        setIdx: vi.fn(),
        activate: vi.fn(),
        close,
      })
    );

    // Simulate Cmd+K inside an input
    const input = document.createElement("input");
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: input });

    document.dispatchEvent(event);

    expect(setIsOpen).not.toHaveBeenCalled();
  });

  it("toggles palette when Cmd+K pressed outside text input", () => {
    const setIsOpen = vi.fn();
    const close = vi.fn();

    renderHook(() =>
      useCommandPaletteKeyboard({
        isOpen: false,
        setIsOpen,
        items: [],
        idx: 0,
        setIdx: vi.fn(),
        activate: vi.fn(),
        close,
      })
    );

    // Simulate Cmd+K on document body
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: document.body });

    document.dispatchEvent(event);

    expect(setIsOpen).toHaveBeenCalled();
  });

  it("does not toggle palette when Cmd+K pressed in textarea", () => {
    const setIsOpen = vi.fn();
    const close = vi.fn();

    renderHook(() =>
      useCommandPaletteKeyboard({
        isOpen: false,
        setIsOpen,
        items: [],
        idx: 0,
        setIdx: vi.fn(),
        activate: vi.fn(),
        close,
      })
    );

    // Simulate Cmd+K inside a textarea
    const textarea = document.createElement("textarea");
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: textarea });

    document.dispatchEvent(event);

    expect(setIsOpen).not.toHaveBeenCalled();
  });
});
