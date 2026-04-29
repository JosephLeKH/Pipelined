import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TimezoneSelector from "./TimezoneSelector";

describe("TimezoneSelector", () => {
  it("should render a select with aria-label Timezone", () => {
    render(<TimezoneSelector value="America/New_York" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "Timezone" })).toBeInTheDocument();
  });

  it("should display the passed value as selected", () => {
    render(<TimezoneSelector value="America/New_York" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "Timezone" })).toHaveValue("America/New_York");
  });

  it("should call onChange when a new timezone is selected", () => {
    const onChange = vi.fn();

    render(<TimezoneSelector value="America/New_York" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Timezone" }), {
      target: { value: "Europe/London" },
    });

    expect(onChange).toHaveBeenCalledWith("Europe/London");
  });
});
