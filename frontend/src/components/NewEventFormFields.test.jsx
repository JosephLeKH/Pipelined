import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NewEventFormFields } from "./NewEventFormFields";

const BASE_PROPS = {
  eventType: "phone_screen",
  setEventType: vi.fn(),
  date: "2026-05-01",
  setDate: vi.fn(),
  time: "",
  setTime: vi.fn(),
  notes: "",
  setNotes: vi.fn(),
  formError: null,
};

describe("NewEventFormFields", () => {
  it("should render event type select with bound value", () => {
    render(<NewEventFormFields {...BASE_PROPS} />);

    expect(screen.getByLabelText(/event type/i)).toBeInTheDocument();
  });

  it("should render date input with bound value", () => {
    render(<NewEventFormFields {...BASE_PROPS} />);

    expect(screen.getByLabelText(/^date$/i)).toHaveValue("2026-05-01");
  });

  it("should call setEventType when event type changes", () => {
    const setEventType = vi.fn();

    render(<NewEventFormFields {...BASE_PROPS} setEventType={setEventType} />);
    fireEvent.change(screen.getByLabelText(/event type/i), { target: { value: "technical" } });

    expect(setEventType).toHaveBeenCalledWith("technical");
  });

  it("should call setDate when date input changes", () => {
    const setDate = vi.fn();

    render(<NewEventFormFields {...BASE_PROPS} setDate={setDate} />);
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: "2026-06-15" } });

    expect(setDate).toHaveBeenCalledWith("2026-06-15");
  });

  it("should show form error message when formError is set", () => {
    render(<NewEventFormFields {...BASE_PROPS} formError="Date is required" />);

    expect(screen.getByText("Date is required")).toBeInTheDocument();
  });
});
