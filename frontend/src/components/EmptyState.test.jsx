/** Tests for EmptyState: renders title/description, icon, action buttons. */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import FolderOpen from "lucide-react/dist/esm/icons/folder-open";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("should render title and description", () => {
    // Arrange / Act
    render(<EmptyState title="No items" description="Nothing here yet." />);

    // Assert
    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
  });

  it("should render icon when provided", () => {
    // Arrange / Act
    render(<EmptyState title="Empty" icon={FolderOpen} />);

    // Assert
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("should not render icon when not provided", () => {
    // Arrange / Act
    render(<EmptyState title="No icon" />);

    // Assert
    expect(document.querySelector("svg")).not.toBeInTheDocument();
  });

  it("should render single action button and fire callback on click", () => {
    // Arrange
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        actionButton={{ label: "Add Item", onClick }}
      />
    );

    // Act
    fireEvent.click(screen.getByText("Add Item"));

    // Assert
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("should render multiple action buttons", () => {
    // Arrange
    const onAdd = vi.fn();
    const onImport = vi.fn();

    // Act
    render(
      <EmptyState
        title="Empty"
        actionButton={[
          { label: "Add", onClick: onAdd },
          { label: "Import", onClick: onImport },
        ]}
      />
    );

    // Assert
    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });

  it("should not render buttons section when no actionButton provided", () => {
    // Arrange / Act
    render(<EmptyState title="No actions" />);

    // Assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
