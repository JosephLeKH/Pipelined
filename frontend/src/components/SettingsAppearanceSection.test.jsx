import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import SettingsAppearanceSection from "./SettingsAppearanceSection";
import {
  ACCENT_KEY,
  DENSITY_KEY,
  FONT_SIZE_KEY,
  initAppearancePrefs,
} from "../lib/appearancePrefs";

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        default_stages: ["Applied", "Phone Screen", "Offer", "Rejected"],
        has_resume: false,
      },
    })
  )
);

beforeEach(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderSection() {
  const queryClient = new QueryClient();
  return render(
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SettingsAppearanceSection />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>,
  );
}

describe("SettingsAppearanceSection", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-density");
    document.documentElement.removeAttribute("data-font-size-step");
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.style.fontSize = "";
    initAppearancePrefs();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-density");
    document.documentElement.removeAttribute("data-font-size-step");
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.style.fontSize = "";
  });

  it("should render appearance heading and controls", () => {
    renderSection();

    expect(screen.getByRole("heading", { name: /appearance/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /theme/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /font size/i })).toBeInTheDocument();
  });

  it("should apply dark theme immediately when Dark is selected", async () => {
    renderSection();

    await userEvent.click(screen.getByRole("radio", { name: /dark/i }));

    expect(localStorage.getItem("pipelined_theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should default to compact density on init", () => {
    renderSection();

    expect(localStorage.getItem(DENSITY_KEY)).toBeNull();
    expect(document.documentElement.dataset.density).toBe("compact");
  });

  it("should set comfortable density and 40px row height token", async () => {
    renderSection();

    await userEvent.click(screen.getByRole("radio", { name: /comfortable/i }));

    expect(localStorage.getItem(DENSITY_KEY)).toBe("comfortable");
    expect(document.documentElement.dataset.density).toBe("comfortable");
  });

  it("should persist font size slider selection", async () => {
    renderSection();

    const slider = screen.getByRole("slider", { name: /font size/i });
    // For range inputs, use fireEvent.change instead of userEvent (which doesn't support clear/type for sliders)
    fireEvent.change(slider, { target: { value: "4" } });

    await waitFor(() => {
      expect(localStorage.getItem(FONT_SIZE_KEY)).toBe("4");
      expect(document.documentElement.dataset.fontSizeStep).toBe("4");
      expect(document.documentElement.style.fontSize).toBe("20px");
    });
  });

  it("should persist accent preference", async () => {
    renderSection();

    await userEvent.click(screen.getByRole("radio", { name: /default \(system\)/i }));

    expect(localStorage.getItem(ACCENT_KEY)).toBe("default");
    expect(document.documentElement.dataset.accent).toBe("default");
  });
});
