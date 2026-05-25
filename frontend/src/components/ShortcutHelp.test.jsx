import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import ShortcutHelp from "./ShortcutHelp";
import { SHORTCUT_SCOPES } from "../lib/shortcuts";

describe("ShortcutHelp", () => {
  it("should not render dialog initially", () => {
    render(<ShortcutHelp />);

    expect(screen.queryByRole("dialog", { name: /keyboard shortcuts/i })).toBeNull();
  });

  it("should open on '?' keydown and show all scope groups", () => {
    render(<ShortcutHelp />);

    fireEvent.keyDown(document, { key: "?" });

    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
    for (const scope of SHORTCUT_SCOPES) {
      expect(screen.getByText(scope)).toBeInTheDocument();
    }
  });

  it("should close when X button is clicked", async () => {
    render(<ShortcutHelp />);

    fireEvent.keyDown(document, { key: "?" });
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("should close on Escape keydown", async () => {
    render(<ShortcutHelp />);

    fireEvent.keyDown(document, { key: "?" });
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("should list PRD-01 navigation and action shortcuts", () => {
    render(<ShortcutHelp />);

    fireEvent.keyDown(document, { key: "?" });

    expect(screen.getByText("Go to Today")).toBeInTheDocument();
    expect(screen.getByText("Go to Inbox")).toBeInTheDocument();
    expect(screen.getByText("Go to Settings")).toBeInTheDocument();
    expect(screen.getByText("Open co-pilot")).toBeInTheDocument();
    expect(screen.getByText("Collapse sidebar")).toBeInTheDocument();
    expect(screen.getByText("g → t")).toBeInTheDocument();
    expect(screen.getByText("g → i")).toBeInTheDocument();
    expect(screen.getByText("g → s")).toBeInTheDocument();
    expect(screen.getByText("o")).toBeInTheDocument();
    expect(screen.getByText("[")).toBeInTheDocument();
  });
});
