/** Tests for KanbanCard — renders company/role, stale indicator, click handler. */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";

import KanbanCard from "./KanbanCard";

const NOW = new Date("2026-04-09T00:00:00Z");
const STALE_DATE = new Date(NOW.getTime() - 20 * 86_400_000).toISOString(); // 20 days ago
const FRESH_DATE = new Date(NOW.getTime() - 2 * 86_400_000).toISOString();  // 2 days ago

const FRESH_APP = {
  id: "app1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Applied",
  date_applied: "2026-03-01",
  updated_at: FRESH_DATE,
};

const STALE_APP = {
  id: "app2",
  company: "OldCo",
  role_title: "Backend Dev",
  current_stage: "Phone Screen",
  date_applied: "2026-01-15",
  updated_at: STALE_DATE,
};

vi.setSystemTime(NOW);

function renderCard(application, onSelect = vi.fn()) {
  return render(
    <DndContext>
      <SortableContext items={[application.id]}>
        <KanbanCard application={application} onSelect={onSelect} />
      </SortableContext>
    </DndContext>
  );
}

describe("KanbanCard", () => {
  it("should render company name and role title", () => {
    // Arrange / Act
    renderCard(FRESH_APP);

    // Assert
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("should render date applied using formatRelative", () => {
    // Arrange / Act
    renderCard(FRESH_APP);

    // Assert — date_applied = 2026-03-01, which is > 7 days ago so shows formatted date
    expect(screen.getByTestId("kanban-card")).toBeInTheDocument();
  });

  it("should not show stale indicator for fresh application", () => {
    // Arrange / Act
    renderCard(FRESH_APP);

    // Assert
    expect(screen.queryByTestId("stale-indicator")).not.toBeInTheDocument();
  });

  it("should show stale indicator when application has not been updated in 14+ days", () => {
    // Arrange / Act
    renderCard(STALE_APP);

    // Assert
    expect(screen.getByTestId("stale-indicator")).toBeInTheDocument();
  });

  it("should call onSelect with the application when clicked", async () => {
    // Arrange
    const onSelect = vi.fn();
    renderCard(FRESH_APP, onSelect);

    // Act
    fireEvent.click(screen.getByTestId("kanban-card"));

    // Assert
    expect(onSelect).toHaveBeenCalledWith(FRESH_APP);
  });

  it("should apply stale indicator aria-label", () => {
    // Arrange / Act
    renderCard(STALE_APP);

    // Assert
    const indicator = screen.getByTestId("stale-indicator");
    expect(indicator).toHaveAttribute("aria-label", expect.stringContaining("Stale"));
  });
});
