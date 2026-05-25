import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PipelineStagesEditor from "./PipelineStagesEditor";

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: vi.fn(),
  arrayMove: vi.fn((arr, from, to) => {
    const result = [...arr];
    result.splice(to, 0, result.splice(from, 1)[0]);
    return result;
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: vi.fn(() => "") } },
}));

vi.mock("./ui/select", () => ({
  Select: ({ children, value }) => <div data-testid={`color-select-${value}`}>{children}</div>,
  SelectTrigger: ({ children, ...props }) => <button type="button" {...props}>{children}</button>,
  SelectValue: ({ placeholder }) => <span>{placeholder}</span>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
}));

const onSave = vi.fn();

function renderEditor(props = {}) {
  const defaults = {
    initialStages: ["Applied", "Phone Screen"],
    onSave,
    isSaving: false,
    saveError: null,
    saveSignal: 0,
    onCancelRequest: 0,
  };
  return render(<PipelineStagesEditor {...defaults} {...props} />);
}

function triggerSave(rerender, props) {
  rerender(
    <PipelineStagesEditor
      initialStages={props.initialStages ?? ["Applied", "Phone Screen"]}
      onSave={onSave}
      isSaving={false}
      saveError={props.saveError ?? null}
      saveSignal={1}
      onCancelRequest={0}
      onDirtyChange={props.onDirtyChange}
    />
  );
}

describe("PipelineStagesEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should render initial stages list with color picker and drag handle", () => {
    renderEditor();

    expect(screen.getByDisplayValue("Applied")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Phone Screen")).toBeInTheDocument();
    expect(screen.getByLabelText(/drag to reorder applied/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/color for applied/i)).toBeInTheDocument();
  });

  it("should show validation error when fewer than 2 stages after remove", () => {
    const { rerender } = renderEditor();

    fireEvent.change(screen.getByLabelText(/stage name: applied/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/stage name: phone screen/i), { target: { value: "" } });

    triggerSave(rerender, {});

    expect(screen.getByRole("alert")).toHaveTextContent("At least 2 stages are required.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("should disable remove for required Offer and Rejected stages", () => {
    renderEditor({
      initialStages: ["Applied", "Offer", "Rejected"],
    });

    expect(screen.getByLabelText(/cannot remove required stage offer/i)).toBeDisabled();
    expect(screen.getByLabelText(/cannot remove required stage rejected/i)).toBeDisabled();
    expect(screen.getByLabelText(/remove stage applied/i)).not.toBeDisabled();
  });

  it("should add a new stage when Add stage is clicked", () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText(/new stage name/i), { target: { value: "Technical" } });
    fireEvent.click(screen.getByRole("button", { name: /add stage/i }));

    expect(screen.getByDisplayValue("Technical")).toBeInTheDocument();
  });

  it("should call onSave with stage names when save is triggered", async () => {
    onSave.mockResolvedValue(undefined);
    const { rerender } = renderEditor({
      initialStages: ["Applied", "Offer", "Rejected"],
    });

    triggerSave(rerender, { initialStages: ["Applied", "Offer", "Rejected"] });

    expect(onSave).toHaveBeenCalledWith(["Applied", "Offer", "Rejected"]);
  });

  it("should show saveError prop as an error message", () => {
    renderEditor({ saveError: "Failed to save. Please try again." });

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to save. Please try again.");
  });

  it("should report dirty state when stages are reordered", () => {
    const onDirtyChange = vi.fn();
    renderEditor({ onDirtyChange, initialStages: ["Applied", "Offer", "Rejected"] });

    expect(onDirtyChange).toHaveBeenCalledWith(false);
  });
});
