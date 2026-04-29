import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardToolbar } from "./DashboardToolbar";

const DEFAULT_PROPS = {
  viewMode: "list",
  onSetViewMode: vi.fn(),
  isExporting: false,
  onImport: vi.fn(),
  onExport: vi.fn(),
  onAdd: vi.fn(),
};

describe("DashboardToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render Dashboard heading", () => {
    render(<DashboardToolbar {...DEFAULT_PROPS} />);

    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
  });

  it("should mark list view button as pressed when viewMode is list", () => {
    render(<DashboardToolbar {...DEFAULT_PROPS} viewMode="list" />);

    expect(screen.getByRole("button", { name: /list view/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /kanban view/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("should mark kanban view button as pressed when viewMode is kanban", () => {
    render(<DashboardToolbar {...DEFAULT_PROPS} viewMode="kanban" />);

    expect(screen.getByRole("button", { name: /kanban view/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /list view/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("should call onSetViewMode with list when List view is clicked", () => {
    const onSetViewMode = vi.fn();

    render(<DashboardToolbar {...DEFAULT_PROPS} onSetViewMode={onSetViewMode} />);

    fireEvent.click(screen.getByRole("button", { name: /list view/i }));

    expect(onSetViewMode).toHaveBeenCalledWith("list");
  });

  it("should call onSetViewMode with kanban when Kanban view is clicked", () => {
    const onSetViewMode = vi.fn();

    render(<DashboardToolbar {...DEFAULT_PROPS} onSetViewMode={onSetViewMode} />);

    fireEvent.click(screen.getByRole("button", { name: /kanban view/i }));

    expect(onSetViewMode).toHaveBeenCalledWith("kanban");
  });

  it("should show spinner and disable Export CSV while isExporting", () => {
    render(<DashboardToolbar {...DEFAULT_PROPS} isExporting={true} />);

    expect(screen.getByRole("button", { name: /export csv/i })).toBeDisabled();
  });

  it("should call onAdd when Add Application is clicked", () => {
    const onAdd = vi.fn();

    render(<DashboardToolbar {...DEFAULT_PROPS} onAdd={onAdd} />);

    fireEvent.click(screen.getByRole("button", { name: /add application/i }));

    expect(onAdd).toHaveBeenCalledOnce();
  });
});
