import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManualAddFormDateRow } from "./ManualAddFormDateRow";

describe("ManualAddFormDateRow", () => {
  it("should render Date Applied input with bound value", () => {
    render(
      <ManualAddFormDateRow
        dateApplied="2026-04-01"
        setDateApplied={vi.fn()}
        compensation=""
        setCompensation={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/date applied/i)).toHaveValue("2026-04-01");
  });

  it("should render Compensation input with bound value", () => {
    render(
      <ManualAddFormDateRow
        dateApplied=""
        setDateApplied={vi.fn()}
        compensation="$150k"
        setCompensation={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/compensation/i)).toHaveValue("$150k");
  });

  it("should call setDateApplied when date input changes", () => {
    const setDateApplied = vi.fn();

    render(
      <ManualAddFormDateRow
        dateApplied=""
        setDateApplied={setDateApplied}
        compensation=""
        setCompensation={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText(/date applied/i), { target: { value: "2026-05-15" } });

    expect(setDateApplied).toHaveBeenCalledWith("2026-05-15");
  });

  it("should call setCompensation when compensation input changes", () => {
    const setCompensation = vi.fn();

    render(
      <ManualAddFormDateRow
        dateApplied=""
        setDateApplied={vi.fn()}
        compensation=""
        setCompensation={setCompensation}
      />
    );
    fireEvent.change(screen.getByLabelText(/compensation/i), { target: { value: "$120k" } });

    expect(setCompensation).toHaveBeenCalledWith("$120k");
  });
});
