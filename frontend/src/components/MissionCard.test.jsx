/** Tests for MissionCard deadline label and row rendering. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import MissionCard from "./MissionCard";

const BASE_MISSION = {
  id: "507f1f77bcf86cd799439011",
  section: "oa_deadlines",
  title: "Acme · Backend Engineer",
  body: "Due in 2 days",
  action_url: "/dashboard?selected=507f1f77bcf86cd799439011",
  priority: 2,
  reason: "OA due in 2 days",
  prep_ready: false,
};

function renderCard(mission = BASE_MISSION, props = {}) {
  return render(
    <MemoryRouter>
      <ul>
        <MissionCard
          mission={mission}
          onSnooze={vi.fn()}
          onDone={vi.fn()}
          isSnoozing={false}
          isCompleting={false}
          {...props}
        />
      </ul>
    </MemoryRouter>,
  );
}

describe("MissionCard", () => {
  it("should show deadline label for oa_deadlines missions", () => {
    renderCard();

    expect(screen.getByText(/Due in 2 days/)).toBeInTheDocument();
    expect(screen.getByText("OA due in 2 days")).toBeInTheDocument();
  });

  it("should show overdue label when deadline is past", () => {
    renderCard({ ...BASE_MISSION, body: "Overdue by 1 day", reason: "OA overdue" });

    expect(screen.getByText(/Overdue 1 day/)).toBeInTheDocument();
  });

  it("should not show deadline label for non-OA sections", () => {
    renderCard({
      ...BASE_MISSION,
      section: "follow_ups",
      body: "Generate a draft on demand in the detail panel",
      reason: "Follow-up is overdue. Respond today",
    });

    expect(screen.queryByText("Due in 2 days")).not.toBeInTheDocument();
  });

  it("should expose Complete and Snooze action buttons", () => {
    renderCard();

    expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Snooze" })).toBeInTheDocument();
  });

  it("should show urgency pill for top-three priorities", () => {
    renderCard({ ...BASE_MISSION, priority: 1 });

    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("should trigger complete on keyboard c when row is focused", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();

    renderCard(BASE_MISSION, { onDone });

    const row = screen.getByRole("button", { name: BASE_MISSION.title });
    row.focus();
    await user.keyboard("c");

    expect(onDone).toHaveBeenCalledWith(BASE_MISSION.id);
  });

  it("should trigger snooze on keyboard s when row is focused", async () => {
    const user = userEvent.setup();
    const onSnooze = vi.fn();

    renderCard(BASE_MISSION, { onSnooze });

    const row = screen.getByRole("button", { name: BASE_MISSION.title });
    row.focus();
    await user.keyboard("s");

    expect(onSnooze).toHaveBeenCalledWith(BASE_MISSION.id);
  });
});
