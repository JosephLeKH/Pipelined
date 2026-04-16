/** Tests for ApplicationRow — swipe-to-reveal actions, desktop click, follow-up bell. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import ApplicationRow from "./ApplicationRow";

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
    ...overrides,
  };
  render(<ApplicationRow {...props} />);
  return props;
}

describe("ApplicationRow — desktop interactions", () => {
  it("should call onSelect when row is clicked", () => {
    const { onSelect } = renderRow();

    fireEvent.click(screen.getByRole("row"));

    expect(onSelect).toHaveBeenCalledWith(APP);
  });

  it("should call onSelect when Enter is pressed on row", () => {
    const { onSelect } = renderRow();

    fireEvent.keyDown(screen.getByRole("row"), { key: "Enter" });

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
});

describe("ApplicationRow — swipe actions", () => {
  let dateNowSpy;

  beforeEach(() => {
    // Freeze time so elapsed calculations are predictable
    const t = Date.now();
    dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(t);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  function getRow() {
    return screen.getByRole("row");
  }

  it("should reveal swipe actions when swiped left past threshold", async () => {
    renderRow();
    const row = getRow();

    // swipe: dx=-100 (> 80px threshold), dy=5 (ratio 20:1 > 2:1), within 300ms
    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 200, clientY: 105 }] });
    fireEvent.touchEnd(row);

    await waitFor(() => {
      expect(screen.getByLabelText("Archive application")).toBeVisible();
    });
  });

  it("should not reveal swipe actions when swipe is below threshold", async () => {
    renderRow();
    const row = getRow();

    // swipe: dx=-50 (< 80px threshold)
    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 250, clientY: 103 }] });
    fireEvent.touchEnd(row);

    const archiveBtn = screen.queryByLabelText("Archive application");
    if (archiveBtn) {
      expect(archiveBtn.closest("[aria-hidden]")).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("should call onArchive and snap back when archive button is tapped after swipe", async () => {
    const { onArchive } = renderRow();
    const row = getRow();

    // Reveal swipe actions
    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 200, clientY: 105 }] });
    fireEvent.touchEnd(row);

    await waitFor(() => expect(screen.getByLabelText("Archive application")).toBeVisible());

    fireEvent.click(screen.getByLabelText("Archive application"));

    expect(onArchive).toHaveBeenCalledWith("a1");
  });

  it("should call onSetFollowUp when follow-up button is tapped after swipe", async () => {
    const { onSetFollowUp } = renderRow();
    const row = getRow();

    fireEvent.touchStart(row, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 200, clientY: 105 }] });
    fireEvent.touchEnd(row);

    await waitFor(() => expect(screen.getByLabelText("Set follow-up")).toBeVisible());

    fireEvent.click(screen.getByLabelText("Set follow-up"));

    expect(onSetFollowUp).toHaveBeenCalledWith("a1");
  });

  it("should not reveal actions on right swipe", () => {
    renderRow();
    const row = getRow();

    // Right swipe: dx=+100
    fireEvent.touchStart(row, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 200, clientY: 103 }] });
    fireEvent.touchEnd(row);

    const actionPanel = document.querySelector("[aria-hidden]");
    expect(actionPanel).not.toHaveAttribute("aria-hidden", "false");
  });
});
