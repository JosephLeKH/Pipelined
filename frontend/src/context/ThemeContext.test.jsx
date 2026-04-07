/** Tests for ThemeContext: class toggling, localStorage persistence, system preference. */

import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { ThemeProvider, useTheme } from "./ThemeContext";

const STORAGE_KEY = "pipelined_theme";

// Minimal consumer component for testing
function ThemeConsumer() {
  const { theme, cycleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button type="button" onClick={cycleTheme}>Cycle</button>
    </div>
  );
}

function renderWithProvider(initialStorage = null) {
  if (initialStorage !== null) {
    localStorage.setItem(STORAGE_KEY, initialStorage);
  }
  return render(
    <ThemeProvider>
      <ThemeConsumer />
    </ThemeProvider>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");

    // Mock matchMedia — default: no dark preference
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.restoreAllMocks();
  });

  it("should default to system theme when no localStorage value is set", () => {
    renderWithProvider();
    expect(screen.getByTestId("theme-value").textContent).toBe("system");
  });

  it("should restore theme from localStorage on mount", () => {
    renderWithProvider("dark");
    expect(screen.getByTestId("theme-value").textContent).toBe("dark");
  });

  it("should apply dark class to documentElement when theme is dark", () => {
    renderWithProvider("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should remove dark class from documentElement when theme is light", () => {
    document.documentElement.classList.add("dark");
    renderWithProvider("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should persist theme to localStorage when cycleTheme is called", async () => {
    renderWithProvider(); // starts at 'system'

    await userEvent.click(screen.getByRole("button", { name: /cycle/i }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");

    await userEvent.click(screen.getByRole("button", { name: /cycle/i }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");

    await userEvent.click(screen.getByRole("button", { name: /cycle/i }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe("system");
  });

  it("should cycle theme: system → light → dark → system", async () => {
    renderWithProvider();
    expect(screen.getByTestId("theme-value").textContent).toBe("system");

    await userEvent.click(screen.getByRole("button", { name: /cycle/i }));
    expect(screen.getByTestId("theme-value").textContent).toBe("light");

    await userEvent.click(screen.getByRole("button", { name: /cycle/i }));
    expect(screen.getByTestId("theme-value").textContent).toBe("dark");

    await userEvent.click(screen.getByRole("button", { name: /cycle/i }));
    expect(screen.getByTestId("theme-value").textContent).toBe("system");
  });

  it("should apply dark class when system preference is dark and theme is system", () => {
    window.matchMedia = vi.fn((query) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    renderWithProvider(); // theme = system, system = dark
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
