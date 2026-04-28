import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OfferComparison from "./OfferComparison";

vi.mock("canvas-confetti");

vi.mock("../hooks/useApplications", () => ({
  useApplications: vi.fn(),
  useUpdateApplication: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock("../components/NavBar", () => ({
  default: () => <nav data-testid="navbar" />,
}));

import { useApplications, useUpdateApplication } from "../hooks/useApplications";

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
  });

  it("should show loading spinner while fetching", () => {
    useApplications.mockReturnValue({ isLoading: true, data: null, error: null });

    renderPage();

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should show empty state when no offers", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [] },
      error: null,
    });

    renderPage();

    expect(screen.getByText(/no offers yet/i)).toBeInTheDocument();
  });

  it("should render table with offer applications", () => {
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
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
    });

    renderPage();

    expect(screen.getByText("Base Salary")).toBeInTheDocument();
    expect(screen.getByText("Total Comp")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
  });

  it("should trigger confetti and show winner badge on mark winner", async () => {
    const confetti = (await import("canvas-confetti")).default;
    useApplications.mockReturnValue({
      isLoading: false,
      data: { data: [makeApp()] },
      error: null,
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
});
