/** Tests for FilterBar — verifies filter controls render, URL param sync, and initial state from URL. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";

import FilterBar from "./FilterBar";

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
  it("should render stage, company type, remote status, and date range controls", () => {
    // Arrange / Act
    render(<FilterBar />, { wrapper: makeWrapper() });

    // Assert — at least one option from each group is visible
    expect(screen.getByRole("checkbox", { name: "Applied" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "startup" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "remote" })).toBeInTheDocument();
    expect(screen.getByLabelText("date from")).toBeInTheDocument();
  });

  it("should check a stage checkbox and update URL params", async () => {
    // Arrange
    render(<FilterBar />, { wrapper: makeWrapper() });
    const checkbox = screen.getByRole("checkbox", { name: "Applied" });

    // Act
    await userEvent.click(checkbox);

    // Assert — checkbox is now checked
    expect(checkbox).toBeChecked();
  });

  it("should read initial stage selection from URL search params", () => {
    // Arrange / Act
    render(<FilterBar />, { wrapper: makeWrapper(["/?stage=Offer"]) });

    // Assert
    expect(screen.getByRole("checkbox", { name: "Offer" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Applied" })).not.toBeChecked();
  });

  it("should read initial date range from URL search params", () => {
    // Arrange / Act
    render(<FilterBar />, {
      wrapper: makeWrapper(["/?date_from=2025-01-01&date_to=2025-12-31"]),
    });

    // Assert
    expect(screen.getByLabelText("date from")).toHaveValue("2025-01-01");
    expect(screen.getByLabelText("date to")).toHaveValue("2025-12-31");
  });

  it("should render the search input", () => {
    // Arrange / Act
    render(<FilterBar />, { wrapper: makeWrapper() });

    // Assert
    expect(screen.getByLabelText("search applications")).toBeInTheDocument();
  });

  it("should read initial search value from URL q param", () => {
    // Arrange / Act
    render(<FilterBar />, { wrapper: makeWrapper(["/?q=Engineer"]) });

    // Assert
    expect(screen.getByLabelText("search applications")).toHaveValue("Engineer");
  });

  it("should update search input value as user types", async () => {
    // Arrange
    render(<FilterBar />, { wrapper: makeWrapper() });
    const input = screen.getByLabelText("search applications");

    // Act
    await userEvent.type(input, "Google");

    // Assert — input value reflects typed text
    expect(input).toHaveValue("Google");
  });

  it("should uncheck a selected stage checkbox", async () => {
    // Arrange — start with Offer selected
    render(<FilterBar />, { wrapper: makeWrapper(["/?stage=Offer"]) });
    const checkbox = screen.getByRole("checkbox", { name: "Offer" });
    expect(checkbox).toBeChecked();

    // Act
    await userEvent.click(checkbox);

    // Assert
    expect(checkbox).not.toBeChecked();
  });

  it("should have id attributes on checkboxes and matching htmlFor on labels", () => {
    // Arrange / Act
    render(<FilterBar />, { wrapper: makeWrapper() });

    // Assert — spot-check stage, company type, and remote status checkboxes
    const appliedCheckbox = screen.getByRole("checkbox", { name: "Applied" });
    expect(appliedCheckbox).toHaveAttribute("id", "filter-stage-Applied");
    expect(appliedCheckbox.closest("label")).toHaveAttribute("for", "filter-stage-Applied");

    const startupCheckbox = screen.getByRole("checkbox", { name: "startup" });
    expect(startupCheckbox).toHaveAttribute("id", "filter-company-type-startup");
    expect(startupCheckbox.closest("label")).toHaveAttribute("for", "filter-company-type-startup");

    const remoteCheckbox = screen.getByRole("checkbox", { name: "remote" });
    expect(remoteCheckbox).toHaveAttribute("id", "filter-remote-status-remote");
    expect(remoteCheckbox.closest("label")).toHaveAttribute("for", "filter-remote-status-remote");
  });
});
