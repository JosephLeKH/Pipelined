import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useWindowHeight } from "./useWindowHeight";

describe("useWindowHeight", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 800 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return current window height on mount", () => {
    const { result } = renderHook(() => useWindowHeight());

    expect(result.current).toBe(800);
  });

  it("should update height after debounce on resize", () => {
    const { result } = renderHook(() => useWindowHeight());

    act(() => {
      window.innerHeight = 600;
      window.dispatchEvent(new Event("resize"));
    });

    // Before debounce fires, value should be unchanged
    expect(result.current).toBe(800);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(600);
  });

  it("should debounce rapid resize events", () => {
    const { result } = renderHook(() => useWindowHeight());

    act(() => {
      window.innerHeight = 500;
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(50);
      window.innerHeight = 700;
      window.dispatchEvent(new Event("resize"));
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(700);
  });
});
