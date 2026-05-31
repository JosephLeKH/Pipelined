import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // Use a safe local date: new Date(year, month, day) avoids timezone issues
  vi.setSystemTime(new Date(2026, 4, 30)); // May 30, 2026
});

afterEach(() => {
  vi.useRealTimers();
});

describe("NewEventFormFields", () => {
  it("should render event type select with bound value", () => {
    render(<NewEventFormFields {...BASE_PROPS} />);

    expect(screen.getByLabelText(/event type/i)).toBeInTheDocument();
  });

  it("should render date input with bound value", () => {
    render(<NewEventFormFields {...BASE_PROPS} />);

    expect(screen.getByLabelText(/^date$/i)).toHaveValue("2026-05-01");
  });

  it("should call setEventType when event type changes", async () => {
    const setEventType = vi.fn();
    const user = userEvent.setup();

    render(<NewEventFormFields {...BASE_PROPS} setEventType={setEventType} />);
    await user.click(screen.getByRole("combobox", { name: /event type/i }));
    await user.click(screen.getByRole("option", { name: /technical/i }));

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

  it("should set min attribute on date input to today", () => {
    render(<NewEventFormFields {...BASE_PROPS} />);

    expect(screen.getByLabelText(/^date$/i)).toHaveAttribute("min", "2026-05-30");
  });

  it("should show past-date validation error when date is before today", () => {
    render(<NewEventFormFields {...BASE_PROPS} date="2026-05-29" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Date cannot be in the past");
  });

  it("should not show past-date error when date is today or later", () => {
    render(<NewEventFormFields {...BASE_PROPS} date="2026-05-30" />);

    expect(screen.queryByText("Date cannot be in the past")).not.toBeInTheDocument();
  });

  it("should include past-date error in aria-describedby", () => {
    render(<NewEventFormFields {...BASE_PROPS} date="2026-05-01" />);

    expect(screen.getByLabelText(/^date$/i)).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("event-form-error")
    );
  });
});
