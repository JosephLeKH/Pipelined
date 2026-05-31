/** Tests for CommandPaletteResults — section header visibility. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { CommandPaletteResults } from "./CommandPaletteResults";

const mockActivate = vi.fn();
const highlightRef = { current: null };

describe("CommandPaletteResults", () => {
  it("should render section headers with improved font size (text-xs)", () => {
    const quickActions = [
      { id: "a", label: "Add Application", hint: "a" },
    ];
    const navItems = [
      { id: "today", label: "Today", hint: "g t" },
    ];

    const { container } = render(
      <CommandPaletteResults
        query=""
        filteredApps={[]}
        quickActions={quickActions}
        navItems={navItems}
        recentApps={[]}
        settingsItems={[]}
        idx={0}
        activate={mockActivate}
        highlightRef={highlightRef}
      />
    );

    const headers = container.querySelectorAll('[class*="text-xs"]');
    expect(headers.length).toBeGreaterThan(0);

    // Check for section headers with proper styling
    const sectionHeaders = Array.from(headers).filter((h) =>
      h.className.includes("uppercase") && (h.className.includes("tracking-wide") || h.className.includes("tracking-wider"))
    );
    expect(sectionHeaders.length).toBeGreaterThan(0);
  });

  it("should render Quick actions section header", () => {
    const quickActions = [
      { id: "a", label: "Add Application", hint: "a" },
    ];

    render(
      <CommandPaletteResults
        query=""
        filteredApps={[]}
        quickActions={quickActions}
        navItems={[]}
        recentApps={[]}
        settingsItems={[]}
        idx={0}
        activate={mockActivate}
        highlightRef={highlightRef}
      />
    );

    expect(screen.getByText("Quick actions")).toBeInTheDocument();
  });

  it("should render Navigation section header", () => {
    const navItems = [
      { id: "today", label: "Today", hint: "g t" },
    ];

    render(
      <CommandPaletteResults
        query=""
        filteredApps={[]}
        quickActions={[]}
        navItems={navItems}
        recentApps={[]}
        settingsItems={[]}
        idx={0}
        activate={mockActivate}
        highlightRef={highlightRef}
      />
    );

    expect(screen.getByText("Navigation")).toBeInTheDocument();
  });

  it("should render Settings shortcuts section header", () => {
    const settingsItems = [
      { id: "s", label: "Settings", hint: "g s" },
    ];

    render(
      <CommandPaletteResults
        query=""
        filteredApps={[]}
        quickActions={[]}
        navItems={[]}
        recentApps={[]}
        settingsItems={settingsItems}
        idx={0}
        activate={mockActivate}
        highlightRef={highlightRef}
      />
    );

    expect(screen.getByText("Settings shortcuts")).toBeInTheDocument();
  });
});
