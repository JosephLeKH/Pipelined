import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsNotificationsSection from "./SettingsNotificationsSection";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useUpdateUser: vi.fn(),
}));

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";

const mockMutateAsync = vi.fn();

const MOCK_USER = {
  stale_alerts_enabled: true,
  interview_reminders: true,
  follow_up_reminders: true,
  digest_enabled: true,
};

describe("SettingsNotificationsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: MOCK_USER });
    useUpdateUser.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
  });

  it("should render toggle switches for all notification types", () => {
    render(<SettingsNotificationsSection />);

    expect(screen.getByText("Stale application alerts")).toBeInTheDocument();
    expect(screen.getByText("Interview reminders")).toBeInTheDocument();
    expect(screen.getByText("Follow-up due")).toBeInTheDocument();
    expect(screen.getByText("Weekly digest email")).toBeInTheDocument();
  });

  it("should revert toggle state when save fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Server error"));

    render(<SettingsNotificationsSection />);

    const toggle = screen.getByRole("switch", { name: /stale application alerts/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });
  });

  it("should show error message when toggle save fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Server error"));

    render(<SettingsNotificationsSection />);

    fireEvent.click(screen.getByRole("switch", { name: /stale application alerts/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to save. Please try again.");
  });

  it("should clear error message on next successful save", async () => {
    mockMutateAsync
      .mockRejectedValueOnce(new Error("Server error"))
      .mockResolvedValueOnce(undefined);

    render(<SettingsNotificationsSection />);

    fireEvent.click(screen.getByRole("switch", { name: /stale application alerts/i }));
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("switch", { name: /interview reminders/i }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
