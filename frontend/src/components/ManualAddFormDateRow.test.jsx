import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManualAddFormDateRow } from "./ManualAddFormDateRow";

describe("ManualAddFormDateRow", () => {
  it("should render Date Applied input with bound value", () => {
    render(
      <ManualAddFormDateRow dateApplied="2026-04-01" setDateApplied={vi.fn()} />
    );

    expect(screen.getByLabelText(/date applied/i)).toHaveValue("2026-04-01");
  });

  it("should call setDateApplied when date input changes", () => {
    const setDateApplied = vi.fn();

    render(<ManualAddFormDateRow dateApplied="" setDateApplied={setDateApplied} />);
    fireEvent.change(screen.getByLabelText(/date applied/i), { target: { value: "2026-05-15" } });

    expect(setDateApplied).toHaveBeenCalledWith("2026-05-15");
  });
});
