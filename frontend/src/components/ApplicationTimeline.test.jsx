/** Tests for ApplicationTimeline — ARIA attributes and rendering. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

vi.mock("../hooks/useCalendar", () => ({
  useApplicationEvents: vi.fn(() => ({ data: [] })),
}));

import { useApplicationEvents } from "../hooks/useCalendar";
import ApplicationTimeline from "./ApplicationTimeline";

const STAGE_HISTORY = [
  { stage: "Applied", transitioned_at: "2024-01-10T12:00:00Z" },
  { stage: "Phone Screen", transitioned_at: "2024-01-15T09:00:00Z" },
];

function renderTimeline(props = {}) {
  return render(
    <ApplicationTimeline
      stageHistory={STAGE_HISTORY}
      applicationId="app1"
      {...props}
    />
  );
}

describe("ApplicationTimeline", () => {
  it("should render the toggle button with aria-expanded", () => {
    renderTimeline();
    const btn = screen.getByRole("button", { name: /toggle timeline/i });
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  it("should collapse timeline on toggle button click", async () => {
    renderTimeline();
    const btn = screen.getByRole("button", { name: /toggle timeline/i });
    await userEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("timeline")).not.toBeInTheDocument();
  });

  it("should render stage nodes when stageHistory is provided", () => {
    renderTimeline();
    expect(screen.getAllByTestId("timeline-stage-node").length).toBe(2);
  });

  it("should render timeline ol with aria-label", () => {
    renderTimeline();
    const ol = screen.getByTestId("timeline");
    expect(ol).toHaveAttribute("aria-label", "Application timeline");
  });

  it("should render timeline ol with aria-live=polite", () => {
    renderTimeline();
    const ol = screen.getByTestId("timeline");
    expect(ol).toHaveAttribute("aria-live", "polite");
  });

  it("should render stage dot with role=img and descriptive aria-label", () => {
    renderTimeline();
    const dots = screen.getAllByRole("img");
    expect(dots.some((el) => el.getAttribute("aria-label")?.startsWith("Stage:"))).toBe(true);
  });

  it("should show empty state with role=status when no activity", () => {
    useApplicationEvents.mockReturnValue({ data: [] });
    renderTimeline({ stageHistory: [] });
    const empty = screen.getByTestId("timeline-empty");
    expect(empty).toHaveAttribute("role", "status");
    expect(empty).toHaveTextContent("No activity yet");
  });

  it("should render event nodes when events are returned from hook", () => {
    useApplicationEvents.mockReturnValue({
      data: [{ id: "ev1", event_type: "phone_screen", date: "2024-01-12", title: "Intro Call" }],
    });
    renderTimeline({ stageHistory: [] });
    expect(screen.getByTestId("timeline-event-node")).toBeInTheDocument();
    expect(screen.getByText("Intro Call")).toBeInTheDocument();
  });
});
