import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OfferDetailsSection from "./OfferDetailsSection";

const mockApp = {
  id: "app1",
  current_stage: "Offer",
  offer_details: {
    base_salary: 120000,
    total_comp: 150000,
    equity: "0.5%",
    notes: null,
  },
};

describe("OfferDetailsSection", () => {
  it("should render the section toggle and field labels", () => {
    render(<OfferDetailsSection application={mockApp} onUpdate={vi.fn()} />);

    expect(screen.getByRole("button", { name: /offer details/i })).toBeInTheDocument();
    expect(screen.getByText(/base salary/i)).toBeInTheDocument();
    expect(screen.getByText(/equity/i)).toBeInTheDocument();
  });

  it("should collapse and expand when toggle is clicked", () => {
    render(<OfferDetailsSection application={mockApp} onUpdate={vi.fn()} />);

    const toggle = screen.getByRole("button", { name: /offer details/i });

    fireEvent.click(toggle);
    expect(screen.queryByText(/base salary/i)).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText(/base salary/i)).toBeInTheDocument();
  });

  it("should enter edit mode on field click", () => {
    render(<OfferDetailsSection application={mockApp} onUpdate={vi.fn()} />);

    const equityBtn = screen.getByRole("button", { name: /edit equity/i });
    fireEvent.click(equityBtn);

    expect(screen.getByRole("textbox", { name: /equity/i })).toBeInTheDocument();
  });

  it("should call onUpdate with merged offer_details on currency field blur", () => {
    const onUpdate = vi.fn();
    render(<OfferDetailsSection application={mockApp} onUpdate={onUpdate} />);

    const signingBonusBtn = screen.getByRole("button", { name: /edit signing bonus/i });
    fireEvent.click(signingBonusBtn);

    const input = screen.getByRole("spinbutton", { name: /signing bonus/i });
    fireEvent.change(input, { target: { value: "25000" } });
    fireEvent.blur(input, { target: { value: "25000" } });

    expect(onUpdate).toHaveBeenCalledWith({
      offer_details: expect.objectContaining({ signing_bonus: 25000 }),
    });
  });

  it("should set field to null when input is cleared", () => {
    const onUpdate = vi.fn();
    render(<OfferDetailsSection application={mockApp} onUpdate={onUpdate} />);

    const equityBtn = screen.getByRole("button", { name: /edit equity/i });
    fireEvent.click(equityBtn);

    const input = screen.getByRole("textbox", { name: /equity/i });
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input, { target: { value: "" } });

    expect(onUpdate).toHaveBeenCalledWith({
      offer_details: expect.objectContaining({ equity: null }),
    });
  });

  it("should show placeholder for null fields", () => {
    render(<OfferDetailsSection application={mockApp} onUpdate={vi.fn()} />);

    const placeholders = screen.getAllByText("Click to set");
    expect(placeholders.length).toBeGreaterThan(0);
  });
});
