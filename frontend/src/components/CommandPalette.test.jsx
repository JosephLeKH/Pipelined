/** Tests for CommandPalette — open/close, search filtering, keyboard navigation, actions. */

import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";

import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { CommandPalette } from "./CommandPalette";
import { RECENT_APPLICATIONS_KEY } from "../lib/recentApplications";

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
afterEach(() => {
  server.resetHandlers();
  localStorage.removeItem(RECENT_APPLICATIONS_KEY);
});
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

function openPalette() {
  fireEvent.keyDown(document, { key: "k", metaKey: true });
}

describe("CommandPalette", () => {
  it("should open on Cmd+K keydown", () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    expect(getPalette()).not.toBeInTheDocument();
    openPalette();
    expect(getPalette()).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("should open on Ctrl+K keydown", () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(getPalette()).toBeInTheDocument();
  });

  it("should close on Escape", () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    expect(getPalette()).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(getPalette()).not.toBeInTheDocument();
  });

  it("should show quick action items when search is empty", () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    const palette = screen.getByRole("dialog", { name: "Command palette" });
    expect(within(palette).getByText("Add Application")).toBeInTheDocument();
    expect(within(palette).getByText("Import CSV")).toBeInTheDocument();
    expect(within(palette).getByText("Open co-pilot")).toBeInTheDocument();
    expect(within(palette).getByText("Start mock interview")).toBeInTheDocument();
  });

  it("should show navigation items when search is empty", () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Scout's Drafts")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Job Board")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should show settings shortcuts when search is empty", () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    const palette = screen.getByRole("dialog", { name: "Command palette" });
    expect(within(palette).getByText("Theme: Light")).toBeInTheDocument();
    expect(within(palette).getByText("Pipeline stages…")).toBeInTheDocument();
    expect(within(palette).getByText("Integrations…")).toBeInTheDocument();
  });

  it("should show recent applications from localStorage when search is empty", async () => {
    localStorage.setItem(RECENT_APPLICATIONS_KEY, JSON.stringify(["app1"]));
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
  });

  it("should filter application results by company name", async () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "Acme" } });
    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.queryByText("Beta Inc")).not.toBeInTheDocument();
  });

  it("should filter application results by role title", async () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "Product" } });
    await waitFor(() => {
      expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    });
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("should show no results message when search has no matches", async () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "zzz-no-match" } });
    await waitFor(() => {
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });
  });

  it("should change highlighted index with arrow keys", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    await waitFor(() => expect(getPalette()).toBeInTheDocument());
    const addBtn = screen.getByText("Add Application").closest("button");
    expect(addBtn).toHaveClass("bg-surface-2");
    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(screen.getByText("Import CSV").closest("button")).toHaveClass("bg-surface-2");
    });
    expect(addBtn).not.toHaveClass("bg-surface-2");
    await user.keyboard("{ArrowUp}");
    await waitFor(() => {
      expect(addBtn).toHaveClass("bg-surface-2");
    });
  });

  it("should close palette after Enter triggers quick action", () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    expect(getPalette()).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Enter" });
    expect(getPalette()).not.toBeInTheDocument();
  });

  it("should close on backdrop click", () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    expect(getPalette()).toBeInTheDocument();
    fireEvent.click(document.querySelector(".fixed.inset-0.z-40"));
    expect(getPalette()).not.toBeInTheDocument();
  });

  it("should show keyboard shortcut hints next to navigation items", () => {
    render(<CommandPalette />, { wrapper: Wrapper });
    openPalette();
    const dashboardRow = screen.getByText("Dashboard").closest("button");
    const kbds = dashboardRow.querySelectorAll("kbd");
    expect(Array.from(kbds).map((k) => k.textContent)).toEqual(["g", "d"]);
  });
});
