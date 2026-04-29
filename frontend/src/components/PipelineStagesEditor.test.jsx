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

const onSave = vi.fn();

describe("PipelineStagesEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render initial stages list", () => {
    render(
      <PipelineStagesEditor
        initialStages={["Applied", "Phone Screen"]}
        onSave={onSave}
        isSaving={false}
        saveError={null}
      />
    );

    expect(screen.getByDisplayValue("Applied")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Phone Screen")).toBeInTheDocument();
  });

  it("should show validation error when fewer than 2 stages after remove", () => {
    render(
      <PipelineStagesEditor
        initialStages={["Applied", "Phone Screen"]}
        onSave={onSave}
        isSaving={false}
        saveError={null}
      />
    );

    fireEvent.change(screen.getByLabelText(/stage name: applied/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/stage name: phone screen/i), { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /save stages/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("At least 2 stages are required.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("should add a new stage when Add is clicked", () => {
    render(
      <PipelineStagesEditor
        initialStages={["Applied", "Phone Screen"]}
        onSave={onSave}
        isSaving={false}
        saveError={null}
      />
    );

    fireEvent.change(screen.getByLabelText(/new stage name/i), { target: { value: "Offer" } });
    fireEvent.click(screen.getByRole("button", { name: /add stage/i }));

    expect(screen.getByDisplayValue("Offer")).toBeInTheDocument();
  });

  it("should call onSave with stage names when Save stages is clicked", () => {
    onSave.mockResolvedValue(undefined);

    render(
      <PipelineStagesEditor
        initialStages={["Applied", "Phone Screen"]}
        onSave={onSave}
        isSaving={false}
        saveError={null}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save stages/i }));

    expect(onSave).toHaveBeenCalledWith(["Applied", "Phone Screen"]);
  });

  it("should show saveError prop as an error message", () => {
    render(
      <PipelineStagesEditor
        initialStages={["Applied", "Phone Screen"]}
        onSave={onSave}
        isSaving={false}
        saveError="Failed to save. Please try again."
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to save. Please try again.");
  });
});
