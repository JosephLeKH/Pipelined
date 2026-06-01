import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useNewEventForm } from "./useNewEventForm";

vi.mock("./useApplications", () => ({
  useApplications: () => ({ data: { data: [] } }),
}));

vi.mock("./useCalendar", () => ({
  useCreateEvent: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("useNewEventForm initialDate handling", () => {
  it("should accept a YYYY-MM-DD string and use it directly", () => {
    const { result } = renderHook(() =>
      useNewEventForm({ initialDate: "2026-06-15", initialApplicationId: null, onClose: vi.fn() })
    );

    expect(result.current.date).toBe("2026-06-15");
  });

  it("should accept a Date object and convert it to ISO date string", () => {
    const { result } = renderHook(() =>
      useNewEventForm({
        initialDate: new Date(2026, 5, 15),
        initialApplicationId: null,
        onClose: vi.fn(),
      })
    );

    expect(result.current.date).toBe("2026-06-15");
  });

  it("should fall back to empty string for null initialDate", () => {
    const { result } = renderHook(() =>
      useNewEventForm({ initialDate: null, initialApplicationId: null, onClose: vi.fn() })
    );

    expect(result.current.date).toBe("");
  });

  it("should fall back to empty string for malformed string initialDate", () => {
    const { result } = renderHook(() =>
      useNewEventForm({ initialDate: "not-a-date", initialApplicationId: null, onClose: vi.fn() })
    );

    expect(result.current.date).toBe("");
  });
});
