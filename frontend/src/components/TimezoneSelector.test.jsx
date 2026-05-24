import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimezoneSelector from "./TimezoneSelector";

describe("TimezoneSelector", () => {
  it("should render a select with aria-label Timezone", () => {
    render(<TimezoneSelector value="America/New_York" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "Timezone" })).toBeInTheDocument();
  });

  it("should display the passed value as selected", () => {
    render(<TimezoneSelector value="America/New_York" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "Timezone" })).toHaveTextContent(/new york/i);
  });

  it("should call onChange when a new timezone is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TimezoneSelector value="America/New_York" onChange={onChange} />);
    await user.click(screen.getByRole("combobox", { name: "Timezone" }));
    await user.click(screen.getByRole("option", { name: /europe\/london/i }));

    expect(onChange).toHaveBeenCalledWith("Europe/London");
  });
});
