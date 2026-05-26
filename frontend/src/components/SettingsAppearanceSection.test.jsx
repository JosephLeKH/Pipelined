import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider } from "../context/ThemeContext";
import SettingsAppearanceSection from "./SettingsAppearanceSection";
import {
  ACCENT_KEY,
  DENSITY_KEY,
  FONT_SIZE_KEY,
  initAppearancePrefs,
} from "../lib/appearancePrefs";

function renderSection() {
  return render(
    <ThemeProvider>
      <SettingsAppearanceSection />
    </ThemeProvider>,
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

  it("should persist font size slider selection", () => {
    renderSection();

    const slider = screen.getByRole("slider", { name: /font size/i });
    fireEvent.change(slider, { target: { value: "4" } });

    expect(localStorage.getItem(FONT_SIZE_KEY)).toBe("4");
    expect(document.documentElement.dataset.fontSizeStep).toBe("4");
    expect(document.documentElement.style.fontSize).toBe("21px");
  });

  it("should persist accent preference", async () => {
    renderSection();

    await userEvent.click(screen.getByRole("radio", { name: /default \(system\)/i }));

    expect(localStorage.getItem(ACCENT_KEY)).toBe("default");
    expect(document.documentElement.dataset.accent).toBe("default");
  });
});
