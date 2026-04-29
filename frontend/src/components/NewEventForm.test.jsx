import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NewEventForm from "./NewEventForm";

vi.mock("../hooks/useNewEventForm", () => ({
  useNewEventForm: vi.fn(),
}));

vi.mock("../hooks/useAppSelector", () => ({
  useAppSelector: vi.fn(),
}));

vi.mock("./NewEventFormFields", () => ({
  NewEventFormFields: () => <div data-testid="event-form-fields" />,
}));

import { useNewEventForm } from "../hooks/useNewEventForm";
import { useAppSelector } from "../hooks/useAppSelector";

const mockHook = {
  handleOverlayClick: vi.fn(),
  handleSubmit: vi.fn(),
  apps: [],
  applicationId: "",
  setApplicationId: vi.fn(),
  eventType: "interview",
  setEventType: vi.fn(),
  date: "",
  setDate: vi.fn(),
  time: "",
  setTime: vi.fn(),
  notes: "",
  setNotes: vi.fn(),
  formError: null,
  isPending: false,
};

const mockAppSelector = {
  appSearch: "",
  filteredApps: [],
  handleSearchChange: vi.fn(),
  handleSelectChange: vi.fn(),
};

describe("NewEventForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNewEventForm.mockReturnValue({ ...mockHook });
    useAppSelector.mockReturnValue({ ...mockAppSelector });
  });

  it("should render the modal dialog", () => {
    render(<NewEventForm initialDate={null} initialApplicationId={null} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("New Event")).toBeInTheDocument();
  });

  it("should call onClose when Cancel is clicked", () => {
    const onClose = vi.fn();

    render(<NewEventForm initialDate={null} initialApplicationId={null} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should call onClose when the X close button is clicked", () => {
    const onClose = vi.fn();

    render(<NewEventForm initialDate={null} initialApplicationId={null} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /close form/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("should disable Save Event button while form is pending", () => {
    useNewEventForm.mockReturnValue({ ...mockHook, isPending: true });

    render(<NewEventForm initialDate={null} initialApplicationId={null} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });
});
