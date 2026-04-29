import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrepSection } from "./PrepSection";

vi.mock("./PrepChecklist", () => ({
  ChecklistItem: ({ item, onDelete }) => (
    <div data-testid={`checklist-item-${item.id}`}>
      {item.text}
      <button type="button" onClick={() => onDelete(item.id)} aria-label={`Delete checklist item: ${item.text}`}>
        Delete
      </button>
    </div>
  ),
  AddChecklistItem: ({ onAdd }) => (
    <button type="button" onClick={() => onAdd("New Item")} aria-label="Add checklist item">
      Add item
    </button>
  ),
}));

const INITIAL_PREP = {
  notes: "",
  checklist: [],
  questions: [],
};

describe("PrepSection", () => {
  let onPrepChange;

  beforeEach(() => {
    vi.clearAllMocks();
    onPrepChange = vi.fn();
  });

  it("should render collapsed by default with Interview Prep toggle button", () => {
    render(<PrepSection initialPrepData={INITIAL_PREP} onPrepChange={onPrepChange} />);

    const toggle = screen.getByRole("button", { name: /interview prep/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("should expand when toggle button is clicked", () => {
    render(<PrepSection initialPrepData={INITIAL_PREP} onPrepChange={onPrepChange} />);

    fireEvent.click(screen.getByRole("button", { name: /interview prep/i }));

    expect(screen.getByRole("button", { name: /interview prep/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("should show prep notes textarea after expanding", () => {
    render(<PrepSection initialPrepData={INITIAL_PREP} onPrepChange={onPrepChange} />);

    fireEvent.click(screen.getByRole("button", { name: /interview prep/i }));

    expect(screen.getByRole("textbox", { name: /prep notes/i })).toBeInTheDocument();
  });

  it("should call onPrepChange when a practice question is added", () => {
    render(<PrepSection initialPrepData={INITIAL_PREP} onPrepChange={onPrepChange} />);
    fireEvent.click(screen.getByRole("button", { name: /interview prep/i }));

    const input = screen.getByRole("textbox", { name: /new practice question/i });
    fireEvent.change(input, { target: { value: "Tell me about yourself" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onPrepChange).toHaveBeenCalledWith(
      expect.objectContaining({ questions: ["Tell me about yourself"] })
    );
  });

  it("should delete a practice question when its delete button is clicked", () => {
    const prep = { ...INITIAL_PREP, questions: ["Why do you want this role?"] };

    render(<PrepSection initialPrepData={prep} onPrepChange={onPrepChange} />);
    fireEvent.click(screen.getByRole("button", { name: /interview prep/i }));

    fireEvent.click(screen.getByRole("button", { name: /delete question: why do you want this role\?/i }));

    expect(onPrepChange).toHaveBeenCalledWith(expect.objectContaining({ questions: [] }));
  });

  it("should disable add question input when max questions reached", () => {
    const questions = Array.from({ length: 20 }, (_, i) => `Question ${i + 1}`);
    const prep = { ...INITIAL_PREP, questions };

    render(<PrepSection initialPrepData={prep} onPrepChange={onPrepChange} />);
    fireEvent.click(screen.getByRole("button", { name: /interview prep/i }));

    expect(screen.getByRole("textbox", { name: /new practice question/i })).toBeDisabled();
  });
});
