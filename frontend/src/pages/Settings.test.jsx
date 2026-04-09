/** Tests for Settings page — pipeline stages section. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import Settings from "./Settings";

const DEFAULT_STAGES = ["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"];

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        display_name: "Test User",
        default_stages: DEFAULT_STAGES,
      },
    })
  ),
  http.patch("/api/auth/me", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: "u1",
        email: "test@example.com",
        display_name: "Test User",
        default_stages: body.default_stages,
      },
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/settings"]}>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("Settings page", () => {
  describe("pipeline stages section", () => {
    it("should render the pipeline stages heading", async () => {
      // Arrange / Act
      render(<Settings />, { wrapper: makeWrapper() });

      // Assert
      expect(screen.getByRole("heading", { name: /pipeline stages/i })).toBeInTheDocument();
    });

    it("should render current stages from user profile", async () => {
      // Arrange / Act
      render(<Settings />, { wrapper: makeWrapper() });

      // Assert — each default stage name is rendered in the editor
      await waitFor(() => {
        expect(screen.getByDisplayValue("Applied")).toBeInTheDocument();
      });
      expect(screen.getByDisplayValue("Phone Screen")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Rejected")).toBeInTheDocument();
    });

    it("should show add stage input", async () => {
      // Arrange / Act
      render(<Settings />, { wrapper: makeWrapper() });

      // Assert
      await waitFor(() => {
        expect(screen.getByRole("textbox", { name: /new stage name/i })).toBeInTheDocument();
      });
    });

    it("should add a new stage when Add is clicked", async () => {
      // Arrange
      render(<Settings />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByDisplayValue("Applied")).toBeInTheDocument();
      });

      // Act
      const input = screen.getByRole("textbox", { name: /new stage name/i });
      await userEvent.type(input, "Screening");
      await userEvent.click(screen.getByRole("button", { name: /add stage/i }));

      // Assert — new stage appears in the list
      expect(screen.getByDisplayValue("Screening")).toBeInTheDocument();
    });

    it("should call PATCH /api/auth/me on save", async () => {
      // Arrange
      const patchSpy = vi.fn();
      server.use(
        http.patch("/api/auth/me", async ({ request }) => {
          const body = await request.json();
          patchSpy(body);
          return HttpResponse.json({
            data: {
              id: "u1",
              email: "test@example.com",
              display_name: "Test User",
              default_stages: body.default_stages,
            },
          });
        })
      );

      render(<Settings />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByDisplayValue("Applied")).toBeInTheDocument();
      });

      // Act
      await userEvent.click(screen.getByRole("button", { name: /save stages/i }));

      // Assert
      await waitFor(() => {
        expect(patchSpy).toHaveBeenCalledWith({
          default_stages: DEFAULT_STAGES,
        });
      });
    });

    it("should show success message after saving", async () => {
      // Arrange
      render(<Settings />, { wrapper: makeWrapper() });
      await waitFor(() => {
        expect(screen.getByDisplayValue("Applied")).toBeInTheDocument();
      });

      // Act
      await userEvent.click(screen.getByRole("button", { name: /save stages/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/saved successfully/i);
      });
    });
  });
});
