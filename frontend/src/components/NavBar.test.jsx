/** Tests for NavBar — hamburger toggle, mobile menu rendering, navigation links. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import NavBar from "./NavBar";
import { passthroughHandlers } from "../test/passthroughHandlers";
import { withTooltipProvider } from "../test/testProviders";

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

describe("NavBar", () => {
  describe("mobile menu", () => {
    it("should render the hamburger button", () => {
      // Arrange / Act
      render(<NavBar />, { wrapper: makeWrapper() });

      // Assert
      expect(screen.getByRole("button", { name: /open menu/i })).toBeInTheDocument();
    });

    it("should not show the mobile nav menu initially", () => {
      // Arrange / Act
      render(<NavBar />, { wrapper: makeWrapper() });

      // Assert
      expect(screen.queryByTestId("mobile-nav-menu")).not.toBeInTheDocument();
    });

    it("should show mobile nav menu when hamburger is clicked", async () => {
      // Arrange
      render(<NavBar />, { wrapper: makeWrapper() });

      // Act
      await userEvent.click(screen.getByRole("button", { name: /open menu/i }));

      // Assert
      expect(screen.getByTestId("mobile-nav-menu")).toBeInTheDocument();
    });

    it("should render all nav links in the mobile menu", async () => {
      // Arrange
      render(<NavBar />, { wrapper: makeWrapper() });

      // Act
      await userEvent.click(screen.getByRole("button", { name: /open menu/i }));

      // Assert — mobile menu contains all navigation links
      const mobileMenu = screen.getByTestId("mobile-nav-menu");
      expect(mobileMenu).toHaveTextContent("Dashboard");
      expect(mobileMenu).toHaveTextContent("Calendar");
      expect(mobileMenu).toHaveTextContent("Analytics");
    });

    it("should close mobile menu when a nav link is clicked", async () => {
      // Arrange
      render(<NavBar />, { wrapper: makeWrapper() });
      await userEvent.click(screen.getByRole("button", { name: /open menu/i }));
      expect(screen.getByTestId("mobile-nav-menu")).toBeInTheDocument();

      // Act — click the Dashboard link inside the mobile menu (last occurrence)
      const dashLinks = screen.getAllByRole("link", { name: /dashboard/i });
      await userEvent.click(dashLinks[dashLinks.length - 1]);

      // Assert
      expect(screen.queryByTestId("mobile-nav-menu")).not.toBeInTheDocument();
    });

    it("should show close icon when mobile menu is open", async () => {
      // Arrange
      render(<NavBar />, { wrapper: makeWrapper() });

      // Act
      await userEvent.click(screen.getByRole("button", { name: /open menu/i }));

      // Assert — button label switches to "Close menu"
      expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument();
    });

    it("should close mobile menu when hamburger is clicked again", async () => {
      // Arrange
      render(<NavBar />, { wrapper: makeWrapper() });
      await userEvent.click(screen.getByRole("button", { name: /open menu/i }));
      expect(screen.getByTestId("mobile-nav-menu")).toBeInTheDocument();

      // Act
      await userEvent.click(screen.getByRole("button", { name: /close menu/i }));

      // Assert
      expect(screen.queryByTestId("mobile-nav-menu")).not.toBeInTheDocument();
    });
  });

  describe("desktop nav", () => {
    it("should render the Pipelined brand name", () => {
      // Arrange / Act
      render(<NavBar />, { wrapper: makeWrapper() });

      // Assert
      expect(screen.getByText("Pipelined")).toBeInTheDocument();
    });
  });
});
