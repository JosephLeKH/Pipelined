import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import SettingsReferralSection from "./SettingsReferralSection";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const USER_WITH_CODE = { referral_code: "REF123", referral_count: 2 };
const USER_NO_CODE = { referral_code: null, referral_count: 0 };

describe("SettingsReferralSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("should render referral link input when user has a referral code", () => {
    render(<SettingsReferralSection user={USER_WITH_CODE} />);

    const input = screen.getByRole("textbox", { name: /referral link/i });
    expect(input).toBeInTheDocument();
    expect(input.value).toContain("REF123");
  });

  it("should show no referral code message when user has no code", () => {
    render(<SettingsReferralSection user={USER_NO_CODE} />);

    expect(screen.getByText(/no referral code available/i)).toBeInTheDocument();
  });

  it("should show Copied after copy button is clicked", async () => {
    render(<SettingsReferralSection user={USER_WITH_CODE} />);

    fireEvent.click(screen.getByRole("button", { name: /copy referral link/i }));

    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("should toast success when referral link is copied", async () => {
    render(<SettingsReferralSection user={USER_WITH_CODE} />);

    fireEvent.click(screen.getByRole("button", { name: /copy referral link/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Referral link copied!");
    });
  });

  it("should show referral stats with earned months", () => {
    render(<SettingsReferralSection user={USER_WITH_CODE} />);

    const stats = screen.getByText(/months free/i).closest("p");
    expect(stats).toHaveTextContent(/2 friends/);
    expect(stats).toHaveTextContent(/Earned 2 months free/);
  });
});
