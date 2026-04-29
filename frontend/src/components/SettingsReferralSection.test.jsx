import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsReferralSection from "./SettingsReferralSection";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const USER_WITH_CODE = { referral_code: "REF123", referral_count: 1 };
const USER_SUPER = { referral_code: "REF999", referral_count: 5 };
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

  it("should show Super Referrer badge when referral count is 3 or more", () => {
    render(<SettingsReferralSection user={USER_SUPER} />);

    expect(screen.getByText("Super Referrer")).toBeInTheDocument();
  });

  it("should not show Super Referrer badge when referral count is below threshold", () => {
    render(<SettingsReferralSection user={USER_WITH_CODE} />);

    expect(screen.queryByText("Super Referrer")).not.toBeInTheDocument();
  });
});
