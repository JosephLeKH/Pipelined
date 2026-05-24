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
  timezone: "America/New_York",
  morning_brief_hour: 8,
  morning_brief_enabled: true,
  morning_brief_email: true,
  morning_brief_in_app: true,
  weekly_digest_enabled: false,
};

describe("SettingsNotificationsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: MOCK_USER });
    useUpdateUser.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
  });

  it("should render timezone selector and morning brief toggles", () => {
    render(<SettingsNotificationsSection />);

    expect(screen.getByLabelText("Timezone")).toBeInTheDocument();
    expect(screen.getByLabelText("Morning brief delivery hour")).toBeInTheDocument();
    expect(screen.getByText("Morning brief")).toBeInTheDocument();
    expect(screen.getByText("Morning brief email")).toBeInTheDocument();
    expect(screen.getByText("Morning brief in-app alert")).toBeInTheDocument();
    expect(screen.getByText("Weekly digest email")).toBeInTheDocument();
  });

  it("should persist morning brief hour changes", async () => {
    mockMutateAsync.mockResolvedValue({ ...MOCK_USER, morning_brief_hour: 10 });

    render(<SettingsNotificationsSection />);

    fireEvent.change(screen.getByLabelText("Morning brief delivery hour"), {
      target: { value: "10" },
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ morning_brief_hour: 10 });
    });
  });

  it("should not show hardcoded 8am delivery copy", () => {
    render(<SettingsNotificationsSection />);

    expect(screen.queryByText(/delivered at 8:00 AM/i)).not.toBeInTheDocument();
    expect(screen.getByText(/currently set to 8am/i)).toBeInTheDocument();
  });

  it("should revert toggle state when save fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Server error"));

    render(<SettingsNotificationsSection />);

    const toggle = screen.getByRole("switch", { name: /morning brief email/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });
  });

  it("should show error message when toggle save fails", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Server error"));

    render(<SettingsNotificationsSection />);

    fireEvent.click(screen.getByRole("switch", { name: /morning brief email/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to save. Please try again.");
  });
});
