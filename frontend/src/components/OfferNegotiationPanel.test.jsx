import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfferNegotiationPanel } from "./OfferNegotiationPanel";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import { toast } from "sonner";

const makeApp = (overrides = {}) => ({
  id: "app1",
  company: "Acme Corp",
  role_title: "Software Engineer",
  offer_details: {
    base_salary: 120000,
    equity_annual_value: 20000,
    signing_bonus: 10000,
    vesting_years: 4,
  },
  ...overrides,
});

function renderPanel(apps = [makeApp()]) {
  return render(<OfferNegotiationPanel apps={apps} />);
}

describe("OfferNegotiationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn() },
      configurable: true,
    });
  });

  it("should render negotiation script for selected template", () => {
    renderPanel();

    const textarea = screen.getByRole("textbox", { name: /negotiation script/i });
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toContain("Acme Corp");
    expect(textarea.value).toContain("Software Engineer");
  });

  it("should show Copied! feedback after successful clipboard write", async () => {
    navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined);

    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /copy script/i }));

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("should show error toast when clipboard write fails", async () => {
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));

    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /copy script/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to copy script to clipboard.");
    });
  });

  it("should update script when different template is selected", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("combobox", { name: /template/i }));
    await user.click(screen.getByRole("option", { name: /equity/i }));

    const textarea = screen.getByRole("textbox", { name: /negotiation script/i });
    expect(textarea.value.toLowerCase()).toContain("equity");
  });
});
