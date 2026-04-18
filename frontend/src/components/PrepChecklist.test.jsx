/** Smoke tests: ChecklistItem and AddChecklistItem render without crash. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ChecklistItem, AddChecklistItem } from "./PrepChecklist";

describe("ChecklistItem", () => {
  it("should render without crashing", () => {
    const item = { id: "1", text: "Research the company", checked: false };

    render(
      <ChecklistItem item={item} onToggle={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByLabelText("Research the company")).toBeInTheDocument();
  });
});

describe("AddChecklistItem", () => {
  it("should render without crashing", () => {
    render(<AddChecklistItem onAdd={vi.fn()} />);

    expect(screen.getByLabelText("New checklist item")).toBeInTheDocument();
  });
});
