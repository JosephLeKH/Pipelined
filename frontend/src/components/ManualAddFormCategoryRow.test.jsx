import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManualAddFormCategoryRow } from "./ManualAddFormCategoryRow";

describe("ManualAddFormCategoryRow", () => {
  it("should render Remote Status select with bound value", () => {
    render(
      <ManualAddFormCategoryRow
        remoteStatus="remote"
        setRemoteStatus={vi.fn()}
        companyType=""
        setCompanyType={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/remote status/i)).toHaveValue("remote");
  });

  it("should render Company Type select with bound value", () => {
    render(
      <ManualAddFormCategoryRow
        remoteStatus=""
        setRemoteStatus={vi.fn()}
        companyType="startup"
        setCompanyType={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/company type/i)).toHaveValue("startup");
  });

  it("should call setRemoteStatus when Remote Status select changes", () => {
    const setRemoteStatus = vi.fn();

    render(
      <ManualAddFormCategoryRow
        remoteStatus=""
        setRemoteStatus={setRemoteStatus}
        companyType=""
        setCompanyType={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText(/remote status/i), { target: { value: "hybrid" } });

    expect(setRemoteStatus).toHaveBeenCalledWith("hybrid");
  });

  it("should call setCompanyType when Company Type select changes", () => {
    const setCompanyType = vi.fn();

    render(
      <ManualAddFormCategoryRow
        remoteStatus=""
        setRemoteStatus={vi.fn()}
        companyType=""
        setCompanyType={setCompanyType}
      />
    );
    fireEvent.change(screen.getByLabelText(/company type/i), { target: { value: "enterprise" } });

    expect(setCompanyType).toHaveBeenCalledWith("enterprise");
  });
});
