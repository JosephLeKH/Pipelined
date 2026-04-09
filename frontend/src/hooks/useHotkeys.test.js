import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

import { useHotkeys } from "./useHotkeys";

function pressKey(key) {
  fireEvent.keyDown(document, { key });
}

describe("useHotkeys", () => {
  const added = [];

  afterEach(() => {
    added.forEach((el) => el.remove());
    added.length = 0;
  });

  it("should fire callback on matching keydown", () => {
    const cb = vi.fn();
    renderHook(() => useHotkeys("j", cb));

    pressKey("j");

    expect(cb).toHaveBeenCalledOnce();
  });

  it("should not fire when a different key is pressed", () => {
    const cb = vi.fn();
    renderHook(() => useHotkeys("j", cb));

    pressKey("k");

    expect(cb).not.toHaveBeenCalled();
  });

  it("should not fire when an input element is focused", () => {
    const cb = vi.fn();
    renderHook(() => useHotkeys("j", cb));

    const input = document.createElement("input");
    document.body.appendChild(input);
    added.push(input);

    fireEvent.keyDown(input, { key: "j" });

    expect(cb).not.toHaveBeenCalled();
  });

  it("should not fire when a textarea is focused", () => {
    const cb = vi.fn();
    renderHook(() => useHotkeys("j", cb));

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    added.push(textarea);

    fireEvent.keyDown(textarea, { key: "j" });

    expect(cb).not.toHaveBeenCalled();
  });

  it("should not fire when enabled is false", () => {
    const cb = vi.fn();
    renderHook(() => useHotkeys("j", cb, { enabled: false }));

    pressKey("j");

    expect(cb).not.toHaveBeenCalled();
  });

  it("should fire again after re-enabling", () => {
    const cb = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useHotkeys("j", cb, { enabled }),
      { initialProps: { enabled: false } }
    );

    pressKey("j");
    expect(cb).not.toHaveBeenCalled();

    rerender({ enabled: true });
    pressKey("j");
    expect(cb).toHaveBeenCalledOnce();
  });
});
