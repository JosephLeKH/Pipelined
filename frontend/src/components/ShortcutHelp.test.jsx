import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import ShortcutHelp from "./ShortcutHelp";
import { SHORTCUT_SCOPES } from "../lib/shortcuts";

describe("ShortcutHelp", () => {
  it("should not render dialog initially", () => {
    render(<ShortcutHelp />);

    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).toBeNull();
  });

  it("should open on '?' keydown and show all scope groups", () => {
    render(<ShortcutHelp />);

    fireEvent.keyDown(document, { key: "?" });

    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    for (const scope of SHORTCUT_SCOPES) {
      expect(screen.getByText(scope)).toBeInTheDocument();
    }
  });

  it("should close when X button is clicked", () => {
    render(<ShortcutHelp />);

    fireEvent.keyDown(document, { key: "?" });
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close shortcuts" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("should close on Escape keydown", () => {
    render(<ShortcutHelp />);

    fireEvent.keyDown(document, { key: "?" });
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
