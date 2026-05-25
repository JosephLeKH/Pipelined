/** Tests for PipelineFunnel — PRD-07 §3.3 custom funnel bars. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { PipelineFunnel, dropOffLabel, stageDotColor } from "./PipelineFunnel";
import { STAGE_COLORS } from "../lib/constants";

const FUNNEL_DATA = [
  { stage: "Applied", entered_count: 100, exited_to_next_count: 50, dropped_count: 50 },
  { stage: "Phone Screen", entered_count: 50, exited_to_next_count: 20, dropped_count: 30 },
  { stage: "Technical", entered_count: 20, exited_to_next_count: 8, dropped_count: 12 },
  { stage: "Onsite", entered_count: 8, exited_to_next_count: 2, dropped_count: 6 },
  { stage: "Offer", entered_count: 2, exited_to_next_count: 0, dropped_count: 2 },
];

describe("PipelineFunnel", () => {
  it("should render Pipeline funnel heading and five stage rows", () => {
    render(<PipelineFunnel funnelData={FUNNEL_DATA} />);

    expect(screen.getByText("Pipeline funnel")).toBeInTheDocument();
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("Phone Screen")).toBeInTheDocument();
    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("Onsite")).toBeInTheDocument();
    expect(screen.getByText("Offer")).toBeInTheDocument();
  });

  it("should render stage-colored bars using STAGE_COLORS dot hex", () => {
    render(<PipelineFunnel funnelData={FUNNEL_DATA} />);

    const appliedBar = screen.getByTestId("funnel-bar-Applied");
    expect(appliedBar).toHaveStyle({ backgroundColor: STAGE_COLORS.Applied.dotColor });
  });

  it("should show drop-off label between consecutive stages", () => {
    render(<PipelineFunnel funnelData={FUNNEL_DATA} />);

    expect(screen.getByTestId("funnel-dropoff-Applied")).toHaveTextContent(
      "−50% drop-off (50 lost)"
    );
  });

  it("should not show drop-off after the last stage", () => {
    render(<PipelineFunnel funnelData={FUNNEL_DATA} />);

    expect(screen.queryByTestId("funnel-dropoff-Offer")).not.toBeInTheDocument();
  });
});

describe("dropOffLabel", () => {
  it("should return null when there is no decrease", () => {
    expect(dropOffLabel({ entered_count: 10 }, { entered_count: 10 })).toBeNull();
  });
});

describe("stageDotColor", () => {
  it("should fall back to default stage color for unknown stages", () => {
    expect(stageDotColor("Unknown")).toBeTruthy();
  });
});
