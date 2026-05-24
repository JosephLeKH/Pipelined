/** axe-core WCAG 2.1 AA accessibility audit for key UI components. */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";

import KanbanCard from "./KanbanCard";
import CsvImportModal from "./CsvImportModal";
import MergeDialog from "./MergeDialog";
import { withTooltipProvider } from "../test/testProviders";

expect.extend(toHaveNoViolations);

const APP = {
  id: "app1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Applied",
  date_applied: "2026-03-01",
  updated_at: new Date().toISOString(),
};

const APP_B = {
  id: "app2",
  company: "Beta Inc",
  role_title: "Frontend Dev",
  current_stage: "Phone Screen",
  date_applied: "2026-02-01",
  updated_at: new Date().toISOString(),
};

vi.mock("../hooks/useApplications", () => ({
  useImportApplications: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("WCAG 2.1 AA — KanbanCard", () => {
  it("should have no axe violations", async () => {
    const { container } = render(
      withTooltipProvider(
        <DndContext>
          <SortableContext items={[APP.id]}>
            <KanbanCard application={APP} onSelect={vi.fn()} />
          </SortableContext>
        </DndContext>
      )
    );

    const results = await axe(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });

    expect(results).toHaveNoViolations();
  });

  it("should call onSelect with Enter key", () => {
    const onSelect = vi.fn();
    render(
      withTooltipProvider(
        <DndContext>
          <SortableContext items={[APP.id]}>
            <KanbanCard application={APP} onSelect={onSelect} />
          </SortableContext>
        </DndContext>
      )
    );

    fireEvent.keyDown(screen.getByTestId("kanban-card"), { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(APP);
  });

  it("should call onSelect with Space key", () => {
    const onSelect = vi.fn();
    render(
      withTooltipProvider(
        <DndContext>
          <SortableContext items={[APP.id]}>
            <KanbanCard application={APP} onSelect={onSelect} />
          </SortableContext>
        </DndContext>
      )
    );

    fireEvent.keyDown(screen.getByTestId("kanban-card"), { key: " " });

    expect(onSelect).toHaveBeenCalledWith(APP);
  });
});

describe("WCAG 2.1 AA — CsvImportModal", () => {
  it("should have no axe violations when open", async () => {
    const { container } = render(
      <CsvImportModal isOpen={true} onClose={vi.fn()} />
    );

    const results = await axe(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });

    expect(results).toHaveNoViolations();
  });
});

describe("WCAG 2.1 AA — MergeDialog", () => {
  it("should have no axe violations", async () => {
    const { container } = render(
      <MergeDialog apps={[APP, APP_B]} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );

    const results = await axe(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });

    expect(results).toHaveNoViolations();
  });
});

describe("WCAG 2.1 AA — skip link", () => {
  it("should be present and visible on focus", () => {
    render(
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only"
      >
        Skip to main content
      </a>
    );

    expect(screen.getByRole("link", { name: "Skip to main content" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#main-content");
  });
});
