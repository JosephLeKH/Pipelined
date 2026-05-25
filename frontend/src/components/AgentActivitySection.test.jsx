import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AgentActivitySection from "./AgentActivitySection";

vi.mock("../hooks/useAgentActivity", () => ({
  useAgentActivity: vi.fn(),
}));

import { useAgentActivity } from "../hooks/useAgentActivity";

const ENTRIES = [
  {
    id: "run1",
    agent_type: "prep",
    status: "success",
    summary: "Interview prep ready for Acme",
    created_at: "2026-05-23T12:00:00Z",
  },
];

describe("AgentActivitySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAgentActivity.mockReturnValue({ data: ENTRIES, isLoading: false });
  });

  it("should load per-app activity when expanded", async () => {
    render(<AgentActivitySection applicationId="app-123" />);

    expect(screen.queryByText("Interview prep ready for Acme")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /agent activity/i }));

    expect(useAgentActivity).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: "app-123", enabled: true }),
    );
    expect(screen.getByText("Interview prep ready for Acme")).toBeInTheDocument();
    expect(screen.getByRole("time")).toBeInTheDocument();
  });

  it("should show error message when fetch fails", async () => {
    useAgentActivity.mockReturnValue({ data: [], isLoading: false, isError: true });

    render(<AgentActivitySection applicationId="app-123" />);
    await userEvent.click(screen.getByRole("button", { name: /agent activity/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load agent activity.");
  });
});
