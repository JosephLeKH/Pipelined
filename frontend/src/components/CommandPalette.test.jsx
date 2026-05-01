/** Tests for CommandPalette — open/close, search filtering, keyboard navigation, actions. */

import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { CommandPalette } from "./CommandPalette";

const APPS = [
  { id: "app1", company: "Acme Corp", role_title: "Software Engineer", current_stage: "Applied" },
  { id: "app2", company: "Beta Inc",  role_title: "Product Manager",   current_stage: "Offer" },
];

const server = setupServer(
  http.get("/api/applications", () =>
    HttpResponse.json({ data: APPS, meta: { total: 2, cursor: null } })
  ),
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        display_name: "Test User",
        default_stages: ["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"],
      },
    })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function Wrapper({ children }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Find the command palette dialog (distinct from ManualAddForm dialog). */
function getPalette() {
  return screen.queryByRole("dialog", { name: "Command palette" });
}

describe("CommandPalette", () => {
  it("should open on Cmd+K keydown", () => {
    // Arrange
    render(<CommandPalette />, { wrapper: Wrapper });

    // Act
    expect(getPalette()).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    // Assert
    expect(getPalette()).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("should open on Ctrl+K keydown", () => {
    // Arrange
    render(<CommandPalette />, { wrapper: Wrapper });

    // Act
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    // Assert
    expect(getPalette()).toBeInTheDocument();
  });

  it("should close on Escape", () => {
    // Arrange
    render(<CommandPalette />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(getPalette()).toBeInTheDocument();

    // Act
    fireEvent.keyDown(document, { key: "Escape" });

    // Assert
    expect(getPalette()).not.toBeInTheDocument();
  });

  it("should show navigation items when search is empty", () => {
    // Arrange / Act
    render(<CommandPalette />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    // Assert
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Job Board")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should show action items when search is empty", () => {
    // Arrange / Act
    render(<CommandPalette />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const palette = screen.getByRole("dialog", { name: "Command palette" });

    // Assert — scope within palette to avoid ManualAddForm's matching text
    expect(within(palette).getByText("Add Application")).toBeInTheDocument();
    expect(within(palette).getByText("Export CSV")).toBeInTheDocument();
    expect(within(palette).getByText("Toggle Dark Mode")).toBeInTheDocument();
  });

  it("should filter application results by company name", async () => {
    // Arrange
    render(<CommandPalette />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    // Act — type to search
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "Acme" } });

    // Assert — wait for async data load + client-side filter
    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.queryByText("Beta Inc")).not.toBeInTheDocument();
  });

  it("should filter application results by role title", async () => {
    // Arrange
    render(<CommandPalette />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    // Act
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "Product" } });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    });
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("should show no results message when search has no matches", async () => {
    // Arrange
    render(<CommandPalette />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    // Act
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "zzz-no-match" } });

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });
  });

  it("should change highlighted index with arrow keys", async () => {
    // Arrange — userEvent properly integrates with React 18 batching
    const user = userEvent.setup();
    render(<CommandPalette />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    // First item (Dashboard) should be highlighted
    const dashboardBtn = screen.getByText("Dashboard").closest("button");
    expect(dashboardBtn).toHaveClass("bg-primary/10");

    // Act — move down (fires on focused input, bubbles to document listener)
    await user.keyboard("{ArrowDown}");

    // Assert — Calendar is now highlighted
    const calendarBtn = screen.getByText("Calendar").closest("button");
    expect(calendarBtn).toHaveClass("bg-primary/10");
    expect(dashboardBtn).not.toHaveClass("bg-primary/10");

    // Act — move back up
    await user.keyboard("{ArrowUp}");

    // Assert — Dashboard is highlighted again
    expect(dashboardBtn).toHaveClass("bg-primary/10");
  });

  it("should close palette after Enter triggers navigation", () => {
    // Arrange
    render(<CommandPalette />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(getPalette()).toBeInTheDocument();

    // Act — Enter on first item (Dashboard)
    fireEvent.keyDown(document, { key: "Enter" });

    // Assert — palette closes after activation
    expect(getPalette()).not.toBeInTheDocument();
  });

  it("should close on backdrop click", () => {
    // Arrange
    render(<CommandPalette />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(getPalette()).toBeInTheDocument();

    // Act — click the backdrop (aria-hidden div behind dialog)
    const backdrop = document.querySelector(".fixed.inset-0.z-40");
    fireEvent.click(backdrop);

    // Assert
    expect(getPalette()).not.toBeInTheDocument();
  });

  it("should show keyboard shortcut hints next to navigation items", () => {
    // Arrange / Act
    render(<CommandPalette />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    // Assert — hint "1" next to Dashboard
    const dashboardRow = screen.getByText("Dashboard").closest("button");
    expect(dashboardRow).toHaveTextContent("1");
  });
});
