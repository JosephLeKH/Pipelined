/** Tests for ShortcutHelp: keyboard trigger, input filtering, shortcut listing. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import ShortcutHelp from "./ShortcutHelp";

describe("ShortcutHelp", () => {
  beforeEach(() => {
    // Ensure document is clean between tests
    document.body.innerHTML = "";
  });

  it("should render the floating button", () => {
    render(<ShortcutHelp />);
    const btn = screen.getByRole("button", { name: /Show keyboard shortcuts/i });
    expect(btn).toBeInTheDocument();
  });

  it("should open when ? is pressed", async () => {
    const user = userEvent.setup();
    render(<ShortcutHelp />);

    // Dialog should start closed
    expect(screen.queryByText("Keyboard shortcuts")).not.toBeInTheDocument();

    // Trigger ? key
    await user.keyboard("?");

    await waitFor(() => {
      expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("should NOT open when ? is pressed inside an input", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input type="text" defaultValue="" data-testid="input" />
        <ShortcutHelp />
      </>
    );

    const input = screen.getByTestId("input");
    await user.click(input);
    await user.keyboard("?");

    // Dialog should remain closed
    expect(screen.queryByText("Keyboard shortcuts")).not.toBeInTheDocument();
  });

  it("should list at least three common shortcuts (a, /, Cmd+K)", async () => {
    const user = userEvent.setup();
    render(<ShortcutHelp />);

    await user.keyboard("?");

    await waitFor(() => {
      // Check for 'a' shortcut
      expect(screen.getByText(/Add new application/i)).toBeInTheDocument();
      // Check for '/' shortcut
      expect(screen.getByText(/Focus search/i)).toBeInTheDocument();
      // Check for Cmd+K shortcut
      expect(screen.getByText(/Open command palette/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("should display shortcuts organized by scope", async () => {
    const user = userEvent.setup();
    render(<ShortcutHelp />);

    await user.keyboard("?");

    await waitFor(() => {
      // Check for scope headers (case-insensitive)
      expect(screen.getByText(/NAVIGATION/i)).toBeInTheDocument();
      expect(screen.getByText(/ACTIONS/i)).toBeInTheDocument();
      expect(screen.getByText(/DASHBOARD/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("should close when clicking the close button", async () => {
    const user = userEvent.setup();
    render(<ShortcutHelp />);

    await user.keyboard("?");

    await waitFor(() => {
      expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
    }, { timeout: 1000 });

    const closeBtn = screen.getByRole("button", { name: /Close/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Keyboard shortcuts")).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("should open when clicking the floating button", async () => {
    const user = userEvent.setup();
    render(<ShortcutHelp />);

    const btn = screen.getByRole("button", { name: /Show keyboard shortcuts/i });
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});
