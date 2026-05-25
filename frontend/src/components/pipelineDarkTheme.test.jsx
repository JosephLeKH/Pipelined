/** Dark-theme regression tests for PRD-04 pipeline surfaces. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";

import ApplicationRow from "./ApplicationRow";
import FitBadge from "./FitBadge";
import KanbanCard from "./KanbanCard";
import { DetailPanelHeader } from "./DetailPanelHeader";
import { withTooltipProvider } from "../test/testProviders";

const APP = {
  id: "a1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Applied",
  source: "manual",
  updated_at: "2026-04-13T00:00:00Z",
  date_applied: "2026-03-01T00:00:00Z",
  company_domain: null,
  follow_up_date: null,
  archived: false,
  ai_analysis: null,
};

const PANEL_APP = {
  ...APP,
  company_domain: "acme.com",
};

describe("PRD-04 pipeline — dark theme", () => {
  beforeEach(() => {
    document.documentElement.classList.add("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("should render ApplicationRow with surface and border tokens", () => {
    render(
      withTooltipProvider(
        <ApplicationRow
          application={APP}
          onSelect={() => {}}
          onArchive={() => {}}
          onUnarchive={() => {}}
          onDelete={() => {}}
          onSetFollowUp={() => {}}
          checked={false}
          onToggle={() => {}}
          hasSelection={false}
          isSelected={false}
        />
      )
    );

    const row = screen.getByRole("listitem");
    expect(row).toHaveClass("border-border-1");
    expect(screen.getByTestId("stage-pill")).toBeInTheDocument();
    expect(screen.getByTestId("stage-pill").querySelector("span.rounded-full")).toBeTruthy();
  });

  it("should render selected ApplicationRow with dark selection tint", () => {
    render(
      withTooltipProvider(
        <ApplicationRow
          application={APP}
          onSelect={() => {}}
          onArchive={() => {}}
          onUnarchive={() => {}}
          onDelete={() => {}}
          onSetFollowUp={() => {}}
          checked={false}
          onToggle={() => {}}
          hasSelection={false}
          isSelected={true}
        />
      )
    );

    expect(screen.getByRole("listitem")).toHaveClass("dark:bg-brand-900/20");
  });

  it("should render FitBadge sparkle with dark brand token", () => {
    render(<FitBadge score={82} />);

    const sparkle = screen.getByTestId("fit-badge").querySelector("svg");
    expect(sparkle).toHaveClass("dark:text-brand-400");
  });

  it("should render KanbanCard with surface tokens", () => {
    render(
      withTooltipProvider(
        <DndContext>
          <SortableContext items={[APP.id]}>
            <KanbanCard application={APP} onSelect={() => {}} />
          </SortableContext>
        </DndContext>
      )
    );

    const card = screen.getByTestId("kanban-card");
    expect(card).toHaveClass("bg-surface-0", "border-border-1");
  });

  it("should render DetailPanelHeader with semantic text tokens", () => {
    render(
      <DetailPanelHeader application={PANEL_APP} onClose={() => {}} onDelete={() => {}} />
    );

    expect(screen.getByRole("heading", { name: /acme corp/i })).toHaveClass("text-text-1");
  });
});
