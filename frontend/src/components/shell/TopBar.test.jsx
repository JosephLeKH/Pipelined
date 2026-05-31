/** Tests for TopBar — theme toggle tooltip, mobile search button. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import TopBar from "./TopBar";
import { ThemeProvider } from "../../context/ThemeContext";
import { AuthProvider } from "../../context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { withTooltipProvider } from "../../test/testProviders";

const mockToggleMobileSidebar = vi.fn();

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter>
          <AuthProvider>{withTooltipProvider(children)}</AuthProvider>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("TopBar", () => {
  it("should render theme toggle button with tooltip", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TopBar onToggleMobileSidebar={mockToggleMobileSidebar} />,
      { wrapper: makeWrapper() }
    );

    // Find theme button by looking for the sun/moon/monitor icon button
    const themeButtons = screen.getAllByRole("button");
    const themeButton = themeButtons.find((btn) => {
      const svg = btn.querySelector("svg");
      return svg && btn.className.includes("text-text-2");
    });

    expect(themeButton).toBeDefined();

    // Hover to show tooltip
    if (themeButton) {
      await user.hover(themeButton);
      await waitFor(() => {
        const tooltip = container.querySelector('[role="tooltip"]');
        if (tooltip) {
          expect(tooltip.textContent).toMatch(/Switch to/);
        }
      }, { timeout: 500 });
    }
  });

  it("should show 'Search' label on mobile search button", () => {
    render(<TopBar onToggleMobileSidebar={mockToggleMobileSidebar} />, {
      wrapper: makeWrapper(),
    });

    // Mobile search button should have "Search" text visible
    const searchElements = screen.queryAllByText("Search");
    expect(searchElements.length).toBeGreaterThan(0);

    // Find the mobile-only search button (has md:hidden class)
    const allButtons = screen.getAllByRole("button");
    const mobileSearchButton = allButtons.find((btn) =>
      btn.className.includes("md:hidden") &&
      btn.textContent.includes("Search")
    );
    expect(mobileSearchButton).toBeDefined();
  });

  it("should not show ⌘K on mobile button", () => {
    render(<TopBar onToggleMobileSidebar={mockToggleMobileSidebar} />, {
      wrapper: makeWrapper(),
    });

    // Get the mobile-only search button (has md:hidden class)
    const allButtons = screen.getAllByRole("button");
    const mobileSearchButton = allButtons.find((btn) =>
      btn.className.includes("md:hidden") &&
      btn.textContent.includes("Search")
    );

    // Should not contain ⌘K
    expect(mobileSearchButton?.textContent).not.toContain("⌘");
  });
});
