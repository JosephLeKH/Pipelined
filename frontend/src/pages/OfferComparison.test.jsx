import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OfferComparison from "./OfferComparison";

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
  offer_details: {
    base_salary: 120000,
    equity_annual_value: 30000,
    signing_bonus: 10000,
    total_comp: 160000,
    equity: "0.5%",
  },
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

  it("should render card grid with offer applications", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    expect(screen.getByRole("list", { name: /offer comparison cards/i })).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("should show PRD compare field labels on cards", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    expect(screen.getByText("Base salary")).toBeInTheDocument();
    expect(screen.getByText("Equity / yr")).toBeInTheDocument();
    expect(screen.getByText("Sign-on")).toBeInTheDocument();
    expect(screen.getByText("Total Y1")).toBeInTheDocument();
  });

  it("should highlight best Total Y1 with Cardinal border and Best badge", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: {
        data: [
          makeApp({
            id: "app1",
            company: "Anthropic",
            offer_details: { base_salary: 200000, equity_annual_value: 80000, signing_bonus: 30000 },
          }),
          makeApp({
            id: "app2",
            company: "Linear",
            offer_details: { base_salary: 175000, equity_annual_value: 120000, signing_bonus: 20000 },
          }),
        ],
      },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    const bestCard = screen.getByRole("article", { name: /linear offer, best total y1/i });
    expect(bestCard).toHaveClass("border-brand-700");
    expect(screen.getByText("Best")).toBeInTheDocument();
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

    const signOnCell = screen.getByRole("button", { name: "$10,000" });
    fireEvent.click(signOnCell);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "15000" } });
    fireEvent.blur(input, { target: { value: "15000" } });

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "app1",
        body: expect.objectContaining({
          offer_details: expect.objectContaining({ signing_bonus: 15000 }),
        }),
      })
    );
  });

  it("should show save pulse after editing a cell", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
      refetch: mockRefetch,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "$10,000" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "15000" } });
    fireEvent.blur(input);

    expect(screen.getByTestId("offer-cell-save-pulse")).toBeInTheDocument();
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
