import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UpgradePlanModal, { TIER_LIMIT_EXCEEDED_EVENT } from "./UpgradePlanModal";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("UpgradePlanModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render modal initially", () => {
    render(<UpgradePlanModal />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should show modal after pipelined:tier_limit_exceeded event", () => {
    render(<UpgradePlanModal />);

    fireEvent(window, new CustomEvent(TIER_LIMIT_EXCEEDED_EVENT));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/you've reached a free plan limit/i)).toBeInTheDocument();
  });

  it("should show resource label and usage when event has limit details", () => {
    render(<UpgradePlanModal />);

    fireEvent(
      window,
      new CustomEvent(TIER_LIMIT_EXCEEDED_EVENT, {
        detail: { limit_name: "max_applications", current_usage: 95, max_allowed: 100 },
      })
    );

    expect(screen.getByText(/applications: 95 \/ 100/i)).toBeInTheDocument();
  });

  it("should close when backdrop is clicked", () => {
    render(<UpgradePlanModal />);
    fireEvent(window, new CustomEvent(TIER_LIMIT_EXCEEDED_EVENT));

    fireEvent.click(screen.getByRole("dialog"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should close when X button is clicked", () => {
    render(<UpgradePlanModal />);
    fireEvent(window, new CustomEvent(TIER_LIMIT_EXCEEDED_EVENT));

    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should close when Escape key is pressed", () => {
    render(<UpgradePlanModal />);
    fireEvent(window, new CustomEvent(TIER_LIMIT_EXCEEDED_EVENT));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should navigate to /pricing and close when Upgrade to Pro is clicked", () => {
    render(<UpgradePlanModal />);
    fireEvent(window, new CustomEvent(TIER_LIMIT_EXCEEDED_EVENT));

    fireEvent.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/pricing");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
