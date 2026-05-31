import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SharePipeline from "./SharePipeline";

vi.mock("../hooks/useSharing", () => ({
  useMyShare: vi.fn(),
  useCreateShare: vi.fn(),
  useRevokeShare: vi.fn(),
}));

vi.mock("../lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

import { useMyShare, useCreateShare, useRevokeShare } from "../hooks/useSharing";

const mockCreateMutate = vi.fn();
const mockRevokeMutate = vi.fn();

const SHARE_FIXTURE = {
  slug: "abc123",
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

describe("SharePipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMyShare.mockReturnValue({ data: null, isLoading: false });
    useCreateShare.mockReturnValue({ mutate: mockCreateMutate, isPending: false });
    useRevokeShare.mockReturnValue({ mutate: mockRevokeMutate, isPending: false });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("should show loading spinner when share data is loading", () => {
    useMyShare.mockReturnValue({ data: null, isLoading: true });

    render(<SharePipeline />);

    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("should show Generate link button when there is no share", () => {
    render(<SharePipeline />);

    expect(screen.getByRole("button", { name: /generate link/i })).toBeInTheDocument();
  });

  it("should call createShare when Generate link is clicked", () => {
    render(<SharePipeline />);

    fireEvent.click(screen.getByRole("button", { name: /generate link/i }));

    expect(mockCreateMutate).toHaveBeenCalledOnce();
  });

  it("should render active share URL when share exists", () => {
    useMyShare.mockReturnValue({ data: SHARE_FIXTURE, isLoading: false });

    render(<SharePipeline />);

    expect(screen.getByLabelText("Share link URL").value).toMatch(/\/pipeline\/abc123/);
  });

  it("should call revokeShare when Revoke link is clicked", () => {
    useMyShare.mockReturnValue({ data: SHARE_FIXTURE, isLoading: false });

    render(<SharePipeline />);
    fireEvent.click(screen.getByRole("button", { name: /revoke link/i }));

    expect(mockRevokeMutate).toHaveBeenCalledOnce();
  });

  it("should show copied state after copy button is clicked", async () => {
    useMyShare.mockReturnValue({ data: SHARE_FIXTURE, isLoading: false });

    render(<SharePipeline />);
    fireEvent.click(screen.getByRole("button", { name: /copy share link/i }));

    expect(await screen.findByRole("button", { name: /link copied/i })).toBeInTheDocument();
  });

  it("should render Open public page link when share exists", () => {
    useMyShare.mockReturnValue({ data: SHARE_FIXTURE, isLoading: false });

    render(<SharePipeline />);

    expect(screen.getByRole("link", { name: /open public page/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/pipeline/abc123"),
    );
  });

  it("should show privacy info card when no share exists", () => {
    render(<SharePipeline />);

    expect(screen.getByText(/public viewers see:/i)).toBeInTheDocument();
    expect(screen.getByText(/public viewers don't see:/i)).toBeInTheDocument();
    expect(screen.getByText(/company names, stages, dates applied, role titles/i)).toBeInTheDocument();
    expect(screen.getByText(/your notes, contact details, follow-up drafts, fit scores, ai insights/i)).toBeInTheDocument();
  });

  it("should show what viewers can and cannot see", () => {
    render(<SharePipeline />);

    // Verify what viewers CAN see
    const canSeeText = screen.getByText(/company names, stages, dates applied, role titles/i);
    expect(canSeeText).toBeInTheDocument();

    // Verify what viewers CANNOT see
    const cannotSeeText = screen.getByText(/your notes, contact details, follow-up drafts, fit scores, ai insights/i);
    expect(cannotSeeText).toBeInTheDocument();
  });
});
