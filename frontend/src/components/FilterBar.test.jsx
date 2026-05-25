/** Tests for FilterBar — inline dropdown filters, URL param sync, saved views. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import FilterBar from "./FilterBar";
import { isoDateDaysAgo } from "../hooks/useFilterBarParams";

vi.mock("../hooks/useSavedSearches", () => ({
  useSavedSearches: vi.fn(() => ({ data: [] })),
  useCreateSavedSearch: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteSavedSearch: vi.fn(() => ({ mutate: vi.fn() })),
}));

function makeWrapper(initialEntries = ["/"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("FilterBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render inline filter triggers for stage, company, remote, and updated", () => {
    render(<FilterBar />, { wrapper: makeWrapper() });

    expect(screen.getByRole("button", { name: /filter by stage/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filter by company/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filter by remote/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filter by updated date/i })).toBeInTheDocument();
  });

  it("should show selected stage in the trigger label from URL params", () => {
    render(<FilterBar />, { wrapper: makeWrapper(["/?stage=Offer"]) });

    expect(screen.getByRole("button", { name: /filter by stage.*offer/i })).toBeInTheDocument();
  });

  it("should show Last 30 days in trigger when URL matches the preset", () => {
    const from = isoDateDaysAgo(30);
    const to = new Date().toISOString().slice(0, 10);
    render(<FilterBar />, { wrapper: makeWrapper([`/?date_from=${from}&date_to=${to}`]) });

    expect(screen.getByRole("button", { name: /filter by updated date.*last 30 days/i })).toBeInTheDocument();
  });

  it("should read initial date range from URL search params", () => {
    render(<FilterBar />, {
      wrapper: makeWrapper(["/?date_from=2025-01-01&date_to=2025-12-31"]),
    });

    expect(screen.getByRole("button", { name: /filter by updated date.*custom/i })).toBeInTheDocument();
  });

  it("should render the search input", () => {
    render(<FilterBar />, { wrapper: makeWrapper() });
    expect(screen.getByLabelText("search applications")).toBeInTheDocument();
  });

  it("should read initial search value from URL q param", () => {
    render(<FilterBar />, { wrapper: makeWrapper(["/?q=Engineer"]) });
    expect(screen.getByLabelText("search applications")).toHaveValue("Engineer");
  });

  it("should update search input value as user types", async () => {
    render(<FilterBar />, { wrapper: makeWrapper() });
    const input = screen.getByLabelText("search applications");

    await userEvent.type(input, "Google");

    expect(input).toHaveValue("Google");
  });

  it("should show Clear when filters are active and clear them on click", async () => {
    render(<FilterBar />, { wrapper: makeWrapper(["/?stage=Offer"]) });

    const clearBtn = screen.getByRole("button", { name: "Clear" });
    await userEvent.click(clearBtn);

    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filter by stage.*all/i })).toBeInTheDocument();
  });

  it("should render saved views dropdown trigger", () => {
    render(<FilterBar />, { wrapper: makeWrapper() });
    expect(screen.getByRole("button", { name: "Saved views" })).toBeInTheDocument();
  });
});
