import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OfferComparison from "./OfferComparison";

vi.mock("canvas-confetti");

vi.mock("../hooks/useApplications", () => ({
  useApplications: vi.fn(),
  useUpdateApplication: vi.fn(() => ({ mutate: vi.fn() })),
}));

import { useApplications, useUpdateApplication } from "../hooks/useApplications";

const mockRefetch = vi.fn();

const makeApp = (overrides = {}) => ({
  id: "app1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Offer",
  offer_details: { base_salary: 120000, total_comp: 150000, equity: "0.5%" },
  ...overrides,
});

function renderPage() {
  return render(
    <MemoryRouter>
      <OfferComparison />
    </MemoryRouter>
  );
}

describe("OfferComparison", () => {
  beforeEach(() => {
    useUpdateApplication.mockReturnValue({ mutate: vi.fn() });
    mockRefetch.mockReset();
  });

  it("should show loading spinner while fetching", () => {
    useApplications.mockReturnValue({ isLoading: true, data: null, error: null, refetch: mockRefetch });

    renderPage();

    expect(document.querySelector(".animate-shimmer")).toBeInTheDocument();
  });

  it("should show empty state when no offers", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [] },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    expect(screen.getByText(/no offers yet/i)).toBeInTheDocument();
  });

  it("should render table with offer applications", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("should show all OFFER_FIELDS as row labels", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    expect(screen.getAllByText("Base Salary").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Total Comp").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Equity").length).toBeGreaterThan(0);
  });

  it("should trigger confetti and show winner badge on mark winner", async () => {
    const confetti = (await import("canvas-confetti")).default;
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    const markBtn = screen.getByRole("button", { name: /mark winner/i });
    fireEvent.click(markBtn);

    expect(confetti).toHaveBeenCalled();
    expect(screen.getByText(/winner!/i)).toBeInTheDocument();
  });

  it("should call updateApp when editing a cell", () => {
    const mutate = vi.fn();
    useUpdateApplication.mockReturnValue({ mutate });
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    const editBtns = screen.getAllByRole("button", { name: /^—$|0\.5%|^$120,000$|^$150,000$/ });
    // click the equity cell (shows "0.5%")
    const equityCell = screen.getByRole("button", { name: "0.5%" });
    fireEvent.click(equityCell);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "1%" } });
    fireEvent.blur(input, { target: { value: "1%" } });

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "app1",
        body: expect.objectContaining({
          offer_details: expect.objectContaining({ equity: "1%" }),
        }),
      })
    );
  });

  it("should show retry button when offer loading fails", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: null,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    renderPage();

    expect(screen.getByText(/failed to load offers/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry loading offers/i })).toBeInTheDocument();
  });

  it("should reload offers when retry button is clicked", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: null,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /retry loading offers/i }));

    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it("should reject negative salary input with validation error", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    const baseSalaryCell = screen.getByRole("button", { name: "$120,000" });
    fireEvent.click(baseSalaryCell);

    const input = screen.getByRole("textbox", { name: /edit currency/i });
    fireEvent.change(input, { target: { value: "-50000" } });
    fireEvent.blur(input);

    expect(screen.getByRole("alert")).toHaveTextContent(/valid non-negative/i);
  });

  it("should reject non-numeric input with validation error", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    const baseSalaryCell = screen.getByRole("button", { name: "$120,000" });
    fireEvent.click(baseSalaryCell);

    const input = screen.getByRole("textbox", { name: /edit currency/i });
    fireEvent.change(input, { target: { value: "100abc" } });
    fireEvent.blur(input);

    expect(screen.getByRole("alert")).toHaveTextContent(/valid non-negative/i);
  });

  it("should accept valid integer salary input", () => {
    const mutate = vi.fn();
    useUpdateApplication.mockReturnValue({ mutate });
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    const baseSalaryCell = screen.getByRole("button", { name: "$120,000" });
    fireEvent.click(baseSalaryCell);

    const input = screen.getByRole("textbox", { name: /edit currency/i });
    fireEvent.change(input, { target: { value: "95000" } });
    fireEvent.blur(input);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          offer_details: expect.objectContaining({ base_salary: 95000 }),
        }),
      })
    );
  });
});
