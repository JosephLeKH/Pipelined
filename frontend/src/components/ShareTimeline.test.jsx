import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShareTimeline from "./ShareTimeline";

vi.mock("../hooks/useSharing", () => ({
  useMyTimelineShare: vi.fn(),
  useCreateTimelineShare: vi.fn(),
  useRevokeTimelineShare: vi.fn(),
}));

vi.mock("../lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

import { useMyTimelineShare, useCreateTimelineShare, useRevokeTimelineShare } from "../hooks/useSharing";

const mockCreateMutate = vi.fn();
const mockRevokeMutate = vi.fn();

const SHARE_FIXTURE = {
  slug: "tl-xyz",
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

describe("ShareTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMyTimelineShare.mockReturnValue({ data: null, isLoading: false });
    useCreateTimelineShare.mockReturnValue({ mutate: mockCreateMutate, isPending: false });
    useRevokeTimelineShare.mockReturnValue({ mutate: mockRevokeMutate, isPending: false });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("should show loading spinner when share data is loading", () => {
    useMyTimelineShare.mockReturnValue({ data: null, isLoading: true });

    render(<ShareTimeline />);

    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("should show Generate link button when there is no share", () => {
    render(<ShareTimeline />);

    expect(screen.getByRole("button", { name: /generate link/i })).toBeInTheDocument();
  });

  it("should call createShare when Generate link is clicked", () => {
    render(<ShareTimeline />);

    fireEvent.click(screen.getByRole("button", { name: /generate link/i }));

    expect(mockCreateMutate).toHaveBeenCalledOnce();
  });

  it("should render active share URL when share exists", () => {
    useMyTimelineShare.mockReturnValue({ data: SHARE_FIXTURE, isLoading: false });

    render(<ShareTimeline />);

    expect(screen.getByText(/shared\/timeline\/tl-xyz/i)).toBeInTheDocument();
  });

  it("should call revokeShare when Revoke link is clicked", () => {
    useMyTimelineShare.mockReturnValue({ data: SHARE_FIXTURE, isLoading: false });

    render(<ShareTimeline />);
    fireEvent.click(screen.getByRole("button", { name: /revoke link/i }));

    expect(mockRevokeMutate).toHaveBeenCalledOnce();
  });

  it("should show Copied! after Copy link is clicked", async () => {
    useMyTimelineShare.mockReturnValue({ data: SHARE_FIXTURE, isLoading: false });

    render(<ShareTimeline />);
    fireEvent.click(screen.getByRole("button", { name: /copy timeline link/i }));

    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });
});
