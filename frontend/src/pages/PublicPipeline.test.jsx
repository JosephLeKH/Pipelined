import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PublicPipeline from "./PublicPipeline";

vi.mock("../hooks/useSharing", () => ({
  usePublicPipeline: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useParams: () => ({ slug: "test-slug" }) };
});

vi.mock("../lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

import { usePublicPipeline } from "../hooks/useSharing";

const PIPELINE_FIXTURE = {
  display_name: "Jane Doe",
  stats: {
    total_applied: 42,
    active_count: 10,
    response_rate: 0.25,
    avg_days_to_first_response: 7,
  },
  applications: [
    { id: "a1", company: "Acme Corp", role_title: "Engineer", current_stage: "Applied", date_applied: "2026-04-01" },
    { id: "a2", company: "Beta Inc", role_title: "Analyst", current_stage: "Phone Screen", date_applied: "2026-04-05" },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <PublicPipeline />
    </MemoryRouter>
  );
}

describe("PublicPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePublicPipeline.mockReturnValue({ data: { data: PIPELINE_FIXTURE }, isLoading: false, isError: false });
  });

  it("should show loading state while pipeline data is loading", () => {
    usePublicPipeline.mockReturnValue({ data: null, isLoading: true, isError: false });

    renderPage();

    expect(document.querySelector(".animate-spin") ?? screen.getByRole("status", { hidden: true }) ?? document.querySelector('[class*="spinner"]') ?? document.querySelector('[class*="animate-spin"]')).toBeTruthy();
  });

  it("should show not found state when fetch returns an error", () => {
    usePublicPipeline.mockReturnValue({ data: null, isLoading: false, isError: true });

    renderPage();

    expect(screen.getByText(/link not found/i)).toBeInTheDocument();
  });

  it("should render the pipeline owner display name in the header", () => {
    renderPage();

    expect(screen.getByText(/jane doe's pipeline/i)).toBeInTheDocument();
  });

  it("should render stat cards for total applied and active count", () => {
    renderPage();

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Total Applied")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("should render a row for each application in the pipeline", () => {
    renderPage();

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
  });

  it("should update document.title with the owner display name", () => {
    renderPage();

    expect(document.title).toContain("Jane Doe");
  });
});
