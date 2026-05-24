/** Tests for ThreadSummarySection AiSection. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ThreadSummarySection from "./ThreadSummarySection";

vi.mock("../api/applications", () => ({
  generateThreadSummary: vi.fn(),
}));

vi.mock("../hooks/useApplications", () => ({
  useEmailEvents: vi.fn(),
}));

import { generateThreadSummary } from "../api/applications";
import { useEmailEvents } from "../hooks/useApplications";

const BASE_APP = {
  id: "app1",
  company: "Acme",
  thread_summary: null,
};

const MOCK_SUMMARY = {
  summary: "Recruiter invited you to a phone screen after your application.",
  reply_options: ["Confirm availability", "Ask about timeline"],
};

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("ThreadSummarySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEmailEvents.mockReturnValue({
      data: [{ id: "evt1", type: "stage_updated", subject: "Interview invite" }],
      isLoading: false,
    });
  });

  it("should render summarize button when email events exist", () => {
    render(<ThreadSummarySection application={BASE_APP} />, { wrapper });

    expect(screen.getByText("Thread summary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /summarize thread/i })).toBeInTheDocument();
  });

  it("should show summary and reply chips after generation", async () => {
    generateThreadSummary.mockResolvedValue(MOCK_SUMMARY);
    const user = userEvent.setup();

    render(<ThreadSummarySection application={BASE_APP} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /summarize thread/i }));

    await waitFor(() => {
      expect(screen.getByTestId("thread-summary-text")).toHaveTextContent("phone screen");
    });
    expect(screen.getByRole("button", { name: "Confirm availability" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy summary" })).toBeInTheDocument();
  });

  it("should render nothing when no email events", () => {
    useEmailEvents.mockReturnValue({ data: [], isLoading: false });

    const { container } = render(<ThreadSummarySection application={BASE_APP} />, { wrapper });

    expect(container).toBeEmptyDOMElement();
  });
});
