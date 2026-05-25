/** Tests for AgentActivityRow — dot, title, timestamp layout. */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AgentActivityRow from "./AgentActivityRow";

const ENTRY = {
  id: "run1",
  agent_type: "autopilot",
  status: "success",
  summary: "Autopilot scanned 1,284 jobs · matched 3",
  created_at: "2026-05-25T12:00:00Z",
};

describe("AgentActivityRow", () => {
  it("should render title and timestamp", () => {
    render(<AgentActivityRow entry={ENTRY} />);

    expect(screen.getByText("Autopilot scanned 1,284 jobs · matched 3")).toBeInTheDocument();
    expect(screen.getByRole("time")).toBeInTheDocument();
  });

  it("should render colored dot for agent type", () => {
    const { container } = render(<AgentActivityRow entry={ENTRY} />);
    const dot = container.querySelector("span[aria-hidden='true']");

    expect(dot).toHaveStyle({ backgroundColor: "#8C1515" });
  });

  it("should call onClick when row is clicked", async () => {
    const onClick = vi.fn();
    render(<AgentActivityRow entry={ENTRY} onClick={onClick} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledWith(ENTRY);
  });
});
