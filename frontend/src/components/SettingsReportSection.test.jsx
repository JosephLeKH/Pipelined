/** Tests for SettingsReportSection — download button, loading state, error and rate-limit messages. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import SettingsReportSection from "./SettingsReportSection";

vi.mock("../api/applications", () => ({
  downloadPdfReport: vi.fn(),
}));

import { downloadPdfReport } from "../api/applications";

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SettingsReportSection", () => {
  it("should render the download button", () => {
    render(<SettingsReportSection />);

    expect(screen.getByRole("button", { name: /download pipeline report/i })).toBeInTheDocument();
  });

  it("should show loading spinner while downloading", async () => {
    downloadPdfReport.mockReturnValue(new Promise(() => {}));

    render(<SettingsReportSection />);
    await userEvent.click(screen.getByRole("button", { name: /download pipeline report/i }));

    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();
  });

  it("should trigger anchor download on success", async () => {
    const mockBlob = new Blob(["pdf-content"], { type: "application/pdf" });
    downloadPdfReport.mockResolvedValue({ blob: mockBlob, retryAfter: null });

    // Render before setting up spies so RTL's container attachment is unaffected
    render(<SettingsReportSection />);

    const mockClick = vi.fn();
    const mockAnchor = { href: "", download: "", click: mockClick, style: {} };
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag, opts) => {
      if (tag === "a") return mockAnchor;
      return realCreateElement(tag, opts);
    });
    vi.spyOn(document.body, "appendChild").mockImplementation(() => mockAnchor);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => mockAnchor);

    await userEvent.click(screen.getByRole("button", { name: /download pipeline report/i }));

    await waitFor(() => expect(mockClick).toHaveBeenCalledOnce());
    expect(mockAnchor.download).toBe("pipeline-report.pdf");
  });

  it("should show rate limit message when retryAfter is set", async () => {
    downloadPdfReport.mockResolvedValue({ blob: null, retryAfter: 60 });

    render(<SettingsReportSection />);
    await userEvent.click(screen.getByRole("button", { name: /download pipeline report/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/rate limit reached/i)
    );
    expect(screen.getByRole("alert")).toHaveTextContent("60 second");
  });

  it("should show error message on failed download", async () => {
    downloadPdfReport.mockRejectedValue(new Error("network error"));

    render(<SettingsReportSection />);
    await userEvent.click(screen.getByRole("button", { name: /download pipeline report/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/failed to download report/i)
    );
  });
});
