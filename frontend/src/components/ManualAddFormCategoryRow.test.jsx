import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

    expect(screen.getByRole("combobox", { name: /remote status/i })).toHaveTextContent("remote");
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

    expect(screen.getByRole("combobox", { name: /company type/i })).toHaveTextContent("startup");
  });

  it("should call setRemoteStatus when Remote Status select changes", async () => {
    const user = userEvent.setup();
    const setRemoteStatus = vi.fn();

    render(
      <ManualAddFormCategoryRow
        remoteStatus=""
        setRemoteStatus={setRemoteStatus}
        companyType=""
        setCompanyType={vi.fn()}
      />
    );

    await user.click(screen.getByRole("combobox", { name: /remote status/i }));
    await user.click(screen.getByRole("option", { name: "hybrid" }));

    expect(setRemoteStatus).toHaveBeenCalledWith("hybrid");
  });

  it("should call setCompanyType when Company Type select changes", async () => {
    const user = userEvent.setup();
    const setCompanyType = vi.fn();

    render(
      <ManualAddFormCategoryRow
        remoteStatus=""
        setRemoteStatus={vi.fn()}
        companyType=""
        setCompanyType={setCompanyType}
      />
    );

    await user.click(screen.getByRole("combobox", { name: /company type/i }));
    await user.click(screen.getByRole("option", { name: "enterprise" }));

    expect(setCompanyType).toHaveBeenCalledWith("enterprise");
  });
});
