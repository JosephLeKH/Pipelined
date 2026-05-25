/** Tests for ApplicationRow — swipe-to-reveal actions, desktop click, follow-up bell. */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import ApplicationRow from "./ApplicationRow";
import { TooltipProvider } from "./ui/tooltip";

const NOW_ISO = "2026-04-15T00:00:00Z";
const FRESH_ISO = "2026-04-13T00:00:00Z"; // 2 days ago — not stale

const APP = {
  id: "a1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  current_stage: "Applied",
  source: "manual",
  updated_at: FRESH_ISO,
  date_applied: "2026-03-01T00:00:00Z",
  company_domain: null,
  follow_up_date: null,
  archived: false,
  ai_analysis: null,
};

function renderRow(overrides = {}) {
  const props = {
    application: APP,
    onSelect: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    onDelete: vi.fn(),
    onSetFollowUp: vi.fn(),
    checked: false,
    onToggle: vi.fn(),
    hasSelection: false,
    isSelected: false,
    ...overrides,
  };
  render(
    <TooltipProvider>
      <ApplicationRow {...props} />
    </TooltipProvider>
  );
  return props;
}

describe("ApplicationRow — desktop interactions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_ISO));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call onSelect when row is clicked", () => {
    const { onSelect } = renderRow();

    fireEvent.click(screen.getByRole("listitem"));

    expect(onSelect).toHaveBeenCalledWith(APP);
  });

  it("should call onSelect when Enter is pressed on row", () => {
    const { onSelect } = renderRow();

    fireEvent.keyDown(screen.getByRole("listitem"), { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(APP);
  });

  it("should show stale indicator for applications not updated in 14+ days", () => {
    const staleDate = "2026-03-01T00:00:00Z"; // 45 days ago relative to NOW_ISO
    renderRow({ application: { ...APP, updated_at: staleDate } });

    expect(screen.getByTestId("stale-indicator")).toBeInTheDocument();
  });

  it("should not show stale indicator for recently updated applications", () => {
    renderRow();

    expect(screen.queryByTestId("stale-indicator")).not.toBeInTheDocument();
  });

  it("should show follow-up bell when follow_up_date is overdue", () => {
    renderRow({ application: { ...APP, follow_up_date: "2026-01-01" } });

    expect(screen.getByTestId("follow-up-bell")).toBeInTheDocument();
  });

  it("should show fit score from ai_analysis when present", () => {
    renderRow({ application: { ...APP, ai_analysis: { fit_score: 82 } } });

    expect(screen.getByTestId("fit-badge")).toHaveTextContent("82%");
  });

  it("should fall back to top-level fit_score when ai_analysis is absent", () => {
    renderRow({ application: { ...APP, fit_score: 67 } });

    expect(screen.getByTestId("fit-badge")).toHaveTextContent("67%");
  });

  it("should render a 40px-tall row on desktop viewport", () => {
    renderRow();

    expect(screen.getByRole("listitem")).toHaveClass("md:h-10");
  });

  it("should apply selected styling when isSelected is true", () => {
    renderRow({ isSelected: true });

    expect(screen.getByRole("listitem")).toHaveClass("border-l-brand-600");
  });
});

describe("ApplicationRow — swipe actions", () => {
  let dateNowSpy;

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });
    const t = Date.now();
    dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(t);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  function getRow() {
    return screen.getByRole("listitem");
  }

  function getSwipePanel() {
    return screen.getByTestId("row-swipe-actions");
  }

  it("should reveal swipe actions when swiped left past threshold", async () => {
    renderRow();
    const row = getRow();

    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 200, clientY: 105 }] });
    fireEvent.touchEnd(row);

    await waitFor(() => {
      expect(within(getSwipePanel()).getByLabelText("Archive application")).toBeVisible();
    });
  });

  it("should not reveal swipe actions when swipe is below threshold", async () => {
    renderRow();
    const row = getRow();

    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 250, clientY: 103 }] });
    fireEvent.touchEnd(row);

    expect(getSwipePanel()).toHaveAttribute("aria-hidden", "true");
  });

  it("should call onArchive and snap back when archive button is tapped after swipe", async () => {
    const { onArchive } = renderRow();
    const row = getRow();

    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 200, clientY: 105 }] });
    fireEvent.touchEnd(row);

    await waitFor(() => expect(within(getSwipePanel()).getByLabelText("Archive application")).toBeVisible());

    fireEvent.click(within(getSwipePanel()).getByLabelText("Archive application"));

    expect(onArchive).toHaveBeenCalledWith("a1");
  });

  it("should call onSetFollowUp when follow-up button is tapped after swipe", async () => {
    const { onSetFollowUp } = renderRow();
    const row = getRow();

    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 200, clientY: 105 }] });
    fireEvent.touchEnd(row);

    await waitFor(() => expect(within(getSwipePanel()).getByLabelText("Set follow-up")).toBeVisible());

    fireEvent.click(within(getSwipePanel()).getByLabelText("Set follow-up"));

    expect(onSetFollowUp).toHaveBeenCalledWith("a1");
  });

  it("should not reveal actions on right swipe", () => {
    renderRow();
    const row = getRow();

    fireEvent.touchStart(row, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 200, clientY: 103 }] });
    fireEvent.touchEnd(row);

    expect(getSwipePanel()).toHaveAttribute("aria-hidden", "true");
  });
});
