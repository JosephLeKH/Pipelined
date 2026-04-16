/** Tests for OfflineBanner — shows when offline, hides when back online. */

import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import OfflineBanner from "./OfflineBanner";

function setOnlineStatus(online) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
}

describe("OfflineBanner", () => {
  beforeEach(() => {
    setOnlineStatus(true);
  });

  afterEach(() => {
    setOnlineStatus(true);
  });

  it("should not render when online", () => {
    render(<OfflineBanner />);

    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
  });

  it("should render when initially offline", () => {
    setOnlineStatus(false);
    render(<OfflineBanner />);

    expect(screen.getByTestId("offline-banner")).toBeInTheDocument();
    expect(screen.getByTestId("offline-banner")).toHaveTextContent(
      "You are offline — changes may not save"
    );
  });

  it("should appear when the offline event fires", () => {
    render(<OfflineBanner />);
    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByTestId("offline-banner")).toBeInTheDocument();
  });

  it("should disappear when the online event fires after being offline", () => {
    setOnlineStatus(false);
    render(<OfflineBanner />);
    expect(screen.getByTestId("offline-banner")).toBeInTheDocument();

    act(() => {
      setOnlineStatus(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByTestId("offline-banner")).not.toBeInTheDocument();
  });

  it("should have accessible role and aria-live", () => {
    setOnlineStatus(false);
    render(<OfflineBanner />);

    const banner = screen.getByTestId("offline-banner");
    expect(banner).toHaveAttribute("role", "status");
    expect(banner).toHaveAttribute("aria-live", "polite");
  });
});
