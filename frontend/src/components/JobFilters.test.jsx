import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { JobFilters } from "./JobFilters";
import { withTooltipProvider } from "../test/testProviders";

function CurrentSearch() {
  const [params] = useSearchParams();
  return <div data-testid="current-search">{params.toString()}</div>;
}

function renderWithRouter(initialSearch = "") {
  return render(
    <MemoryRouter initialEntries={[`/jobs${initialSearch}`]}>
      {withTooltipProvider(<JobFilters />)}
    </MemoryRouter>
  );
}

describe("JobFilters", () => {
  it("should render inline filter dropdown labels", () => {
    renderWithRouter();

    expect(screen.getByText(/remote:/i)).toBeInTheDocument();
    expect(screen.getByText(/type:/i)).toBeInTheDocument();
    expect(screen.getByText(/level:/i)).toBeInTheDocument();
    expect(screen.getByText(/posted:/i)).toBeInTheDocument();
    expect(screen.getByText(/sort:/i)).toBeInTheDocument();
  });

  it("should show Any as default remote filter value", () => {
    renderWithRouter();

    expect(screen.getByRole("button", { name: /remote: any/i })).toBeInTheDocument();
  });

  it("should show selected remote filter in trigger label", () => {
    renderWithRouter("?remote_status=remote");

    expect(screen.getByRole("button", { name: /remote: remote/i })).toBeInTheDocument();
  });

  it("should show Best match as default sort", () => {
    renderWithRouter();

    expect(screen.getByRole("button", { name: /sort: best match/i })).toBeInTheDocument();
  });

  it("should render filter region for accessibility", () => {
    renderWithRouter();

    expect(screen.getByRole("region", { name: /job filters/i })).toBeInTheDocument();
  });

  it("should open the menu and update the URL when a filter option is selected", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/jobs"]}>
        <Routes>
          <Route path="/jobs" element={
            <>
              {withTooltipProvider(<JobFilters />)}
              <CurrentSearch />
            </>
          } />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /remote: any/i }));
    const remoteItem = await screen.findByRole("menuitem", { name: /^remote$/i });
    await user.click(remoteItem);

    expect(screen.getByTestId("current-search").textContent).toContain("remote_status=remote");
  });
});
