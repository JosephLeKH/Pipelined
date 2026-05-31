/** Tests for AppShell — mobile drawer, sidebar nav, active route state. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../../context/AuthContext";
import { ThemeProvider } from "../../context/ThemeContext";
import AppShell from "./AppShell";
import { passthroughHandlers } from "../../test/passthroughHandlers";
import { withTooltipProvider } from "../../test/testProviders";

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        display_name: "Test",
      },
    })
  ),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function ShellRoutes({ initialEntries = ["/dashboard"] }) {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<p>Dashboard content</p>} />
        <Route path="/calendar" element={<p>Calendar content</p>} />
      </Route>
    </Routes>
  );
}

function makeWrapper(initialEntries = ["/dashboard"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <AuthProvider>{withTooltipProvider(children)}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("AppShell", () => {
  it("should render the Pipelined brand in the sidebar", () => {
    render(<ShellRoutes />, { wrapper: makeWrapper() });
    expect(screen.getByText("Pipelined")).toBeInTheDocument();
  });

  it("should mark Pipeline as active on /dashboard", () => {
    render(<ShellRoutes />, { wrapper: makeWrapper(["/dashboard"]) });
    const dashLink = screen.getByRole("link", { name: /pipeline/i });
    expect(dashLink).toHaveAttribute("aria-current", "page");
  });

  it("should show mobile sidebar toggle on small viewports", () => {
    render(<ShellRoutes />, { wrapper: makeWrapper() });
    expect(screen.getByRole("button", { name: /toggle sidebar/i })).toBeInTheDocument();
  });

  it("should open mobile navigation drawer from hamburger", async () => {
    render(<ShellRoutes />, { wrapper: makeWrapper() });
    await userEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    expect(screen.getByRole("dialog", { name: /navigation menu/i })).toBeInTheDocument();
  });

  it("should render page title from route meta", () => {
    render(<ShellRoutes />, { wrapper: makeWrapper(["/dashboard"]) });
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
  });

  it("should render sidebar with visible border in light theme", () => {
    render(<ShellRoutes />, { wrapper: makeWrapper() });
    const sidebar = screen.getByRole("complementary", { name: /main navigation/i });
    expect(sidebar).toHaveClass("border-r", "border-border-1");
  });

  it("should render sidebar with visible border in dark theme", () => {
    document.documentElement.classList.add("dark");
    render(<ShellRoutes />, { wrapper: makeWrapper() });
    const sidebar = screen.getByRole("complementary", { name: /main navigation/i });
    expect(sidebar).toHaveClass("border-r", "border-border-1");
    document.documentElement.classList.remove("dark");
  });
});
