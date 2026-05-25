import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DetailPanelNotes } from "./DetailPanelNotes";

vi.mock("./NotesEditor", () => ({
  default: ({ applicationId }) => <div data-testid="notes-editor" data-app-id={applicationId} />,
}));

describe("DetailPanelNotes", () => {
  it("should render NotesEditor with the correct applicationId", () => {
    render(<DetailPanelNotes applicationId="app-123" initialValue="some notes" onDirtyChange={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument();
    const editor = screen.getByTestId("notes-editor");
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute("data-app-id", "app-123");
  });
});
