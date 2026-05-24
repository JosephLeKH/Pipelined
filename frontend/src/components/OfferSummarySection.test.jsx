/** Tests for OfferSummarySection AiSection. */

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import OfferSummarySection from "./OfferSummarySection";

vi.mock("../hooks/useApplications", () => ({
  useApplications: vi.fn(),
}));

import { useApplications } from "../hooks/useApplications";

const BASE_APP = {
  id: "app1",
  company: "Acme",
  current_stage: "Offer",
  offer_details: {
    base_salary: 150000,
    signing_bonus: 10000,
    equity: "0.1%",
  },
};

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe("OfferSummarySection", () => {
  it("should render comp summary for Offer-stage application", () => {
    useApplications.mockReturnValue({ data: [BASE_APP] });

    render(<OfferSummarySection application={BASE_APP} />, { wrapper });

    expect(screen.getByText("Offer summary")).toBeInTheDocument();
    expect(screen.getByTestId("offer-summary-comp")).toHaveTextContent("$150,000 base");
    expect(screen.queryByTestId("offer-compare-link")).not.toBeInTheDocument();
  });

  it("should show compare link when user has two or more offers", () => {
    useApplications.mockReturnValue({
      data: [BASE_APP, { ...BASE_APP, id: "app2", company: "Beta" }],
    });

    render(<OfferSummarySection application={BASE_APP} />, { wrapper });

    expect(screen.getByTestId("offer-compare-link")).toHaveTextContent("Compare 2 offers");
  });

  it("should render nothing for non-Offer stages", () => {
    useApplications.mockReturnValue({ data: [] });

    const { container } = render(
      <OfferSummarySection application={{ ...BASE_APP, current_stage: "Applied" }} />,
      { wrapper }
    );

    expect(container).toBeEmptyDOMElement();
  });
});
