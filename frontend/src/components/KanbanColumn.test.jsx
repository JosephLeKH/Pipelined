import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KanbanColumn } from "./KanbanColumn";

vi.mock("@dnd-kit/core", () => ({
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }) => <>{children}</>,
  verticalListSortingStrategy: {},
}));

vi.mock("./KanbanCard", () => ({
  default: ({ application, onSelect }) => (
    <div
      data-testid="kanban-card"
      onClick={() => onSelect(application)}
    >
      {application.company}
    </div>
  ),
}));

const makeApp = (overrides = {}) => ({
  id: "app1",
  company: "Acme",
  role_title: "Engineer",
  current_stage: "Applied",
  ...overrides,
});

describe("KanbanColumn", () => {
  it("should render stage name and application count badge", () => {
    render(<KanbanColumn stage="Applied" applications={[makeApp()]} onSelect={vi.fn()} />);

    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByLabelText("1 applications")).toBeInTheDocument();
  });

  it("should render empty drop zone when no applications", () => {
    render(<KanbanColumn stage="Offer" applications={[]} onSelect={vi.fn()} />);

    expect(screen.getByLabelText("No applications")).toBeInTheDocument();
  });

  it("should render a KanbanCard for each application", () => {
    const apps = [makeApp({ id: "a1" }), makeApp({ id: "a2", company: "Beta" })];

    render(<KanbanColumn stage="Applied" applications={apps} onSelect={vi.fn()} />);

    expect(screen.getAllByTestId("kanban-card")).toHaveLength(2);
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("should call onSelect with the application when a card is clicked", () => {
    const onSelect = vi.fn();
    const app = makeApp();

    render(<KanbanColumn stage="Applied" applications={[app]} onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId("kanban-card"));

    expect(onSelect).toHaveBeenCalledWith(app);
  });
});
