/** Tests for CsvImportModal — 4-step wizard, import flow, result summary. */

import { render, screen, waitFor, within } from "@testing-library/react";
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

const CSV_CONTENT = "company,role_title\nAcme,SWE\nBeta,PM";

async function uploadCsvFile() {
  const fileInput = screen.getByLabelText(/csv file/i);
  const csvFile = new File([CSV_CONTENT], "apps.csv", { type: "text/csv" });
  await userEvent.upload(fileInput, csvFile);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /^next$/i })).not.toBeDisabled();
  });
}

describe("CsvImportModal", () => {
  it("should render the 4-step progress indicator when open", () => {
    render(<CsvImportModal isOpen={true} onClose={() => {}} />, { wrapper: makeWrapper() });

    expect(screen.getByRole("dialog", { name: /import csv/i })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /import progress/i })).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Map columns")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });

  it("should not render when isOpen is false", () => {
    render(<CsvImportModal isOpen={false} onClose={() => {}} />, { wrapper: makeWrapper() });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should enable Next after a file is selected on step 1", async () => {
    render(<CsvImportModal isOpen={true} onClose={() => {}} />, { wrapper: makeWrapper() });

    await uploadCsvFile();
  });

  it("should advance through mapping and preview steps", async () => {
    render(<CsvImportModal isOpen={true} onClose={() => {}} />, { wrapper: makeWrapper() });

    await uploadCsvFile();
    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Target field")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));

    expect(screen.getByText(/showing first/i)).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("should POST mapped file and show result summary on success", async () => {
    render(<CsvImportModal isOpen={true} onClose={() => {}} />, { wrapper: makeWrapper() });

    await uploadCsvFile();
    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^import$/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("3");
      expect(screen.getByRole("status")).toHaveTextContent("1");
    });
  });

  it("should show error alert when import request fails", async () => {
    server.use(
      http.post("/api/applications/import", () =>
        HttpResponse.json(
          { error: { code: "FILE_TOO_LARGE", message: "CSV file exceeds 2 MB limit." } },
          { status: 413 }
        )
      )
    );
    render(<CsvImportModal isOpen={true} onClose={() => {}} />, { wrapper: makeWrapper() });

    await uploadCsvFile();
    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^next$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^import$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("2 MB");
    });
  });

  it("should call onClose when Close button is clicked", async () => {
    const onClose = vi.fn();
    render(<CsvImportModal isOpen={true} onClose={onClose} />, { wrapper: makeWrapper() });

    const dialog = screen.getByRole("dialog");
    const closeButtons = within(dialog).getAllByRole("button", { name: /^close$/i });
    await userEvent.click(closeButtons[closeButtons.length - 1]);

    expect(onClose).toHaveBeenCalledOnce();
  });
});
