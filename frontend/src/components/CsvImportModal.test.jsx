/** Tests for CsvImportModal — file input, import flow, result summary. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import CsvImportModal from "./CsvImportModal";

const server = setupServer(
  http.post("/api/applications/import", () =>
    HttpResponse.json({
      data: { imported: 3, skipped: 1, errors: [], warning: null },
    })
  ),
  http.get("/api/applications", () =>
    HttpResponse.json({ data: [], meta: { count: 0, next_cursor: null } })
  ),
  http.get("/api/applications/stats", () =>
    HttpResponse.json({ data: { total_applied: 0, active_count: 0, response_rate: 0 } })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("CsvImportModal", () => {
  it("should render the file input when open", () => {
    // Arrange / Act
    render(<CsvImportModal isOpen={true} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    expect(screen.getByRole("dialog", { name: /import csv/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/csv file/i)).toBeInTheDocument();
  });

  it("should not render when isOpen is false", () => {
    // Arrange / Act
    render(<CsvImportModal isOpen={false} onClose={() => {}} />, { wrapper: makeWrapper() });

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should enable Import button after a file is selected", async () => {
    // Arrange
    render(<CsvImportModal isOpen={true} onClose={() => {}} />, { wrapper: makeWrapper() });
    const fileInput = screen.getByLabelText(/csv file/i);
    const csvFile = new File(["company,role_title\nAcme,SWE"], "apps.csv", { type: "text/csv" });

    // Act
    await userEvent.upload(fileInput, csvFile);

    // Assert
    expect(screen.getByRole("button", { name: /import csv/i })).not.toBeDisabled();
  });

  it("should POST file and show result summary on success", async () => {
    // Arrange
    render(<CsvImportModal isOpen={true} onClose={() => {}} />, { wrapper: makeWrapper() });
    const fileInput = screen.getByLabelText(/csv file/i);
    const csvFile = new File(["company,role_title\nAcme,SWE"], "apps.csv", { type: "text/csv" });

    await userEvent.upload(fileInput, csvFile);

    // Act
    await userEvent.click(screen.getByRole("button", { name: /import csv/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("3");
      expect(screen.getByRole("status")).toHaveTextContent("1");
    });
  });

  it("should show error alert when import request fails", async () => {
    // Arrange
    server.use(
      http.post("/api/applications/import", () =>
        HttpResponse.json(
          { error: { code: "FILE_TOO_LARGE", message: "CSV file exceeds 2 MB limit." } },
          { status: 413 }
        )
      )
    );
    render(<CsvImportModal isOpen={true} onClose={() => {}} />, { wrapper: makeWrapper() });
    const fileInput = screen.getByLabelText(/csv file/i);
    const csvFile = new File(["company,role_title\nAcme,SWE"], "apps.csv", { type: "text/csv" });

    await userEvent.upload(fileInput, csvFile);

    // Act
    await userEvent.click(screen.getByRole("button", { name: /import csv/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("should call onClose when Close button is clicked", async () => {
    // Arrange
    const onClose = vi.fn();
    render(<CsvImportModal isOpen={true} onClose={onClose} />, { wrapper: makeWrapper() });

    // Act
    await userEvent.click(screen.getByRole("button", { name: /close import modal/i }));

    // Assert
    expect(onClose).toHaveBeenCalledOnce();
  });
});
