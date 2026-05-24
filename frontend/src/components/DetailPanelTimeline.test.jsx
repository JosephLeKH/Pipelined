import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DetailPanelTimeline } from "./DetailPanelTimeline";

vi.mock("./ApplicationTimeline", () => ({
  default: ({ applicationId }) => <div data-testid="app-timeline" data-app-id={applicationId} />,
}));

vi.mock("./CalendarEventsList", () => ({
  default: ({ applicationId }) => <div data-testid="calendar-events" data-app-id={applicationId} />,
}));

vi.mock("./EmailTimelineSection", () => ({
  default: ({ applicationId }) => <div data-testid="email-timeline" data-app-id={applicationId} />,
}));

describe("DetailPanelTimeline", () => {
  it("should render ApplicationTimeline and CalendarEventsList with correct applicationId", () => {
    render(<DetailPanelTimeline stageHistory={[]} applicationId="app-456" onAddEvent={vi.fn()} />);

    expect(screen.getByTestId("app-timeline")).toHaveAttribute("data-app-id", "app-456");
    expect(screen.getByTestId("email-timeline")).toHaveAttribute("data-app-id", "app-456");
    expect(screen.getByTestId("calendar-events")).toHaveAttribute("data-app-id", "app-456");
  });
});
