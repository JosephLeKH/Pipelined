import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import SettingsAgentActivitySection from "./SettingsAgentActivitySection";

vi.mock("../hooks/useAgentActivity", () => ({
  useAgentActivity: vi.fn(),
}));

import { useAgentActivity } from "../hooks/useAgentActivity";

const ENTRIES = [
  {
    id: "run1",
    agent_type: "fit",
    status: "success",
    summary: "Fit score 88: Strong Python overlap",
    created_at: "2026-05-23T12:00:00Z",
  },
];

describe("SettingsAgentActivitySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render agent activity timeline entries", () => {
    useAgentActivity.mockReturnValue({ data: ENTRIES, isLoading: false, isError: false });

    render(<SettingsAgentActivitySection />);

    expect(screen.getByLabelText("Agent activity timeline")).toBeInTheDocument();
    expect(screen.getByText("Fit score")).toBeInTheDocument();
    expect(screen.getByText(/Strong Python overlap/)).toBeInTheDocument();
  });

  it("should show empty state when no entries", () => {
    useAgentActivity.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(<SettingsAgentActivitySection />);

    expect(screen.getByText("No agent activity yet.")).toBeInTheDocument();
  });
});
