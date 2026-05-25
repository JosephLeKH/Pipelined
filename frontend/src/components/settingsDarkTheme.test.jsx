/** Dark-theme regression tests for PRD-08 settings surfaces. */

import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";

import SettingsAppearanceSection from "./SettingsAppearanceSection";
import SettingsNav from "./SettingsNav";
import SettingsPageShell from "./SettingsPageShell";
import SettingsUsageSection from "./SettingsUsageSection";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import Settings from "../pages/Settings";
import { passthroughHandlers } from "../test/passthroughHandlers";
import { withTooltipProvider } from "../test/testProviders";

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        display_name: "Test User",
        default_stages: ["Applied", "Offer", "Rejected"],
        application_count: 85,
        contact_count: 42,
        ai_scores_today: 9,
        referral_code: "test-user",
        referral_count: 2,
      },
    }),
  ),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  document.documentElement.classList.remove("dark");
});
afterAll(() => server.close());

function makeSettingsWrapper(initialEntries = ["/settings/profile"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return () => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route
              path="/settings/*"
              element={
                <AuthProvider>{withTooltipProvider(<Settings />)}</AuthProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}


describe("PRD-08 settings — dark theme", () => {
  beforeEach(() => {
    document.documentElement.classList.add("dark");
  });

  describe("layout shell", () => {
    it("should render Settings page heading with text-text-1 token", async () => {
      render(null, { wrapper: makeSettingsWrapper(["/settings/profile"]) });

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /^settings$/i, level: 1 })).toHaveClass(
          "text-text-1",
        );
      });
    });

    it("should render SettingsNav with border-border-1 in dark mode", async () => {
      render(null, { wrapper: makeSettingsWrapper(["/settings/profile"]) });

      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /settings sections/i })).toHaveClass(
          "border-border-1",
        );
      });
    });

    it("should render active nav row with Cardinal left bar in dark mode", async () => {
      render(null, { wrapper: makeSettingsWrapper(["/settings/stages"]) });

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /pipeline stages/i });
        expect(link).toHaveAttribute("aria-current", "page");
        expect(link).toHaveClass("text-brand-600");
        expect(link.querySelector("span.bg-brand-600")).toBeTruthy();
      });
    });
  });

  describe("re-skinned sections", () => {
    it("should render Profile section with display-md title in dark mode", async () => {
      render(null, { wrapper: makeSettingsWrapper(["/settings/profile"]) });

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /^profile$/i, level: 2 })).toHaveClass(
          "text-text-1",
        );
      });
    });

    it("should render Appearance section with semantic text tokens", () => {
      render(
        withTooltipProvider(
          <ThemeProvider>
            <SettingsAppearanceSection />
          </ThemeProvider>,
        ),
      );

      expect(screen.getByRole("heading", { name: /^appearance$/i })).toHaveClass("text-text-1");
      expect(screen.getByText(/customize theme, density/i)).toHaveClass("text-text-2");
    });

    it("should render Usage meters with surface-2 track and brand fill in dark mode", () => {
      render(
        withTooltipProvider(<SettingsUsageSection user={{ application_count: 85 }} />),
      );

      const bar = screen.getByRole("progressbar", { name: "Applications" });
      expect(bar).toHaveClass("bg-surface-2");
      expect(barFill(bar)).toHaveClass("bg-status-warn");
    });

    it("should render SettingsPageShell sticky footer with surface-0 background", () => {
      render(
        <SettingsPageShell
          title="Profile"
          subtitle="Update your profile."
          dirty
          onSave={() => {}}
          onCancel={() => {}}
        >
          <p className="text-text-1">Content</p>
        </SettingsPageShell>,
      );

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("bg-surface-0", "border-border-1");
    });
  });

  describe("SettingsNav isolation", () => {
    it("should use text-text-3 for group labels in dark mode", () => {
      render(
        <MemoryRouter initialEntries={["/settings/profile"]}>
          <SettingsNav />
        </MemoryRouter>,
      );

      expect(screen.getByText("ACCOUNT")).toHaveClass("text-text-3");
    });
  });
});

function barFill(bar) {
  return bar.querySelector("div:not([role])");
}
