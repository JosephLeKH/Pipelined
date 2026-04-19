/** Tests for SettingsReportSection — download button, loading state, error and rate-limit messages. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import SettingsReportSection from "./SettingsReportSection";

const mockHandleDownload = vi.fn();
vi.mock("../hooks/useApplicationExport", () => ({
  useApplicationExport: vi.fn(() => ({
    handleDownload: mockHandleDownload,
    isLoading: false,
    error: null,
    retryAfter: null,
  })),
}));

import { useApplicationExport } from "../hooks/useApplicationExport";

beforeEach(() => {
  vi.clearAllMocks();
  useApplicationExport.mockReturnValue({
    handleDownload: mockHandleDownload,
    isLoading: false,
    error: null,
    retryAfter: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SettingsReportSection", () => {
  it("should render the download button", () => {
    render(<SettingsReportSection />);

    expect(screen.getByRole("button", { name: /download pipeline report/i })).toBeInTheDocument();
  });

  it("should show loading spinner while downloading", () => {
    useApplicationExport.mockReturnValue({
      handleDownload: mockHandleDownload,
      isLoading: true,
      error: null,
      retryAfter: null,
    });

    render(<SettingsReportSection />);

    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();
  });

  it("should call handleDownload when button is clicked", async () => {
    render(<SettingsReportSection />);

    await userEvent.click(screen.getByRole("button", { name: /download pipeline report/i }));

    expect(mockHandleDownload).toHaveBeenCalledOnce();
  });

  it("should show rate limit message when retryAfter is set", () => {
    useApplicationExport.mockReturnValue({
      handleDownload: mockHandleDownload,
      isLoading: false,
      error: null,
      retryAfter: 60,
    });

    render(<SettingsReportSection />);

    expect(screen.getByRole("alert")).toHaveTextContent(/rate limit reached/i);
    expect(screen.getByRole("alert")).toHaveTextContent("60 second");
  });

  it("should show error message when error is set", () => {
    useApplicationExport.mockReturnValue({
      handleDownload: mockHandleDownload,
      isLoading: false,
      error: "Failed to download report. Please try again.",
      retryAfter: null,
    });

    render(<SettingsReportSection />);

    expect(screen.getByRole("alert")).toHaveTextContent(/failed to download report/i);
  });
});
