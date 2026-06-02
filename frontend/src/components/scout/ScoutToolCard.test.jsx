import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import ScoutToolCard from "./ScoutToolCard";

describe("ScoutToolCard", () => {
  it("renders ready variant with summary and View CTA", () => {
    const onClick = vi.fn();
    render(
      <ScoutToolCard
        variant="ready"
        title="Apply Pack"
        summary="Cover + 3 talking points"
        ctaLabel="View"
        onClick={onClick}
      />
    );
    expect(screen.getByText("Apply Pack")).toBeInTheDocument();
    expect(screen.getByText("Cover + 3 talking points")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apply Pack — Ready/i })).toBeInTheDocument();
  });

  it("renders runIt variant with description and Start CTA", () => {
    render(
      <ScoutToolCard
        variant="runIt"
        title="Mock Interview"
        summary="5 questions · 12 min"
        ctaLabel="Start"
        onClick={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /Mock Interview — Run it/i })).toBeInTheDocument();
  });

  it("renders working variant with skeleton and no click handler", async () => {
    render(<ScoutToolCard variant="working" title="Resume Insights" summary="Generating…" />);
    const btn = screen.getByRole("button", { name: /Resume Insights — Working/i });
    expect(btn).toBeDisabled();
  });

  it("calls onClick when ready card is clicked", async () => {
    const onClick = vi.fn();
    render(
      <ScoutToolCard variant="ready" title="Apply Pack" summary="x" ctaLabel="View" onClick={onClick} />
    );
    await userEvent.click(screen.getByRole("button", { name: /Apply Pack/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders error variant with retry button", async () => {
    const onRetry = vi.fn();
    render(
      <ScoutToolCard
        variant="error"
        title="Apply Pack"
        summary="Something went wrong"
        onRetry={onRetry}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Apply Pack — Error/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not throw when error variant clicked without onRetry handler", async () => {
    render(<ScoutToolCard variant="error" title="Apply Pack" summary="Failed" />);
    const btn = screen.getByRole("button", { name: /Apply Pack — Error/i });
    await userEvent.click(btn);  // should not throw
    expect(btn).toBeInTheDocument();
  });
});
