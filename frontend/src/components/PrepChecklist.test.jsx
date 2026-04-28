/** Behavioral tests: ChecklistItem and AddChecklistItem interactions. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { ChecklistItem, AddChecklistItem } from "./PrepChecklist";

const ITEM = { id: "1", text: "Research the company", checked: false };
const CHECKED_ITEM = { id: "2", text: "Review JD", checked: true };

describe("ChecklistItem", () => {
  it("should render without crashing", () => {
    render(<ChecklistItem item={ITEM} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByLabelText("Research the company")).toBeInTheDocument();
  });

  it("should call onToggle with item id when checkbox is clicked", async () => {
    const onToggle = vi.fn();

    render(<ChecklistItem item={ITEM} onToggle={onToggle} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledWith("1");
  });

  it("should call onDelete with item id when delete button is clicked", async () => {
    const onDelete = vi.fn();

    render(<ChecklistItem item={ITEM} onToggle={vi.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: /delete checklist item/i }));

    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("should render checked item with strikethrough style", () => {
    render(<ChecklistItem item={CHECKED_ITEM} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const label = screen.getByText("Review JD");
    expect(label).toHaveClass("line-through");
  });
});

describe("AddChecklistItem", () => {
  it("should render without crashing", () => {
    render(<AddChecklistItem onAdd={vi.fn()} />);

    expect(screen.getByLabelText("New checklist item")).toBeInTheDocument();
  });

  it("should call onAdd with trimmed text when Enter is pressed", async () => {
    const onAdd = vi.fn();

    render(<AddChecklistItem onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText("New checklist item"), "Prepare questions{Enter}");

    expect(onAdd).toHaveBeenCalledWith("Prepare questions");
  });

  it("should clear the input after adding an item", async () => {
    render(<AddChecklistItem onAdd={vi.fn()} />);
    const input = screen.getByLabelText("New checklist item");

    await userEvent.type(input, "Some item{Enter}");

    expect(input).toHaveValue("");
  });

  it("should not call onAdd when Enter is pressed with only whitespace", async () => {
    const onAdd = vi.fn();

    render(<AddChecklistItem onAdd={onAdd} />);
    await userEvent.type(screen.getByLabelText("New checklist item"), "   {Enter}");

    expect(onAdd).not.toHaveBeenCalled();
  });
});
