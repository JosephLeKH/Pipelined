/** Tests for EmailTimelineSection in the detail panel. */

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";

import EmailTimelineSection from "./EmailTimelineSection";

const EVENTS = [
  {
    id: "evt1",
    type: "stage_updated",
    timestamp: "2026-05-20T10:00:00Z",
    application_id: "app1",
    company: "Acme",
    role_title: "Engineer",
    stage: "Interviewing",
    subject: "Interview invite from Acme",
  },
];

vi.mock("../hooks/useApplications", () => ({
  useEmailEvents: vi.fn(),
}));

import { useEmailEvents } from "../hooks/useApplications";

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("EmailTimelineSection", () => {
  it("should render email timeline events when data is available", () => {
    useEmailEvents.mockReturnValue({ data: EVENTS, isLoading: false, isError: false });

    render(<EmailTimelineSection applicationId="app1" />, { wrapper });

    expect(screen.getByLabelText("Email timeline")).toBeInTheDocument();
    expect(screen.getByText("Moved to Interviewing")).toBeInTheDocument();
    expect(screen.getByText("Interview invite from Acme")).toBeInTheDocument();
    expect(screen.getAllByTestId("email-timeline-node")).toHaveLength(1);
  });

  it("should render nothing when there are no events", () => {
    useEmailEvents.mockReturnValue({ data: [], isLoading: false, isError: false });

    const { container } = render(<EmailTimelineSection applicationId="app1" />, { wrapper });

    expect(container).toBeEmptyDOMElement();
  });
});
