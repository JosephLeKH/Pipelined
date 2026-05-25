/** Tests for Settings page — two-column layout and pipeline stages section. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import Settings from "./Settings";
import { passthroughHandlers } from "../test/passthroughHandlers";
import { withTooltipProvider } from "../test/testProviders";

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
  }),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper(initialEntries = ["/settings"]) {
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

describe("Settings page", () => {
  describe("layout and navigation", () => {
    it("should render two-column layout with settings heading and sub-nav", () => {
      render(null, { wrapper: makeWrapper(["/settings/profile"]) });

      expect(screen.getByRole("heading", { name: /^settings$/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: /settings sections/i })).toBeInTheDocument();
    });

    it("should redirect /settings to /settings/profile by default", async () => {
      render(null, { wrapper: makeWrapper(["/settings"]) });

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /^profile$/i })).toHaveAttribute(
          "aria-current",
          "page",
        );
      });
    });

    it("should highlight active nav item with aria-current", async () => {
      render(null, { wrapper: makeWrapper(["/settings/stages"]) });

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /pipeline stages/i })).toHaveAttribute(
          "aria-current",
          "page",
        );
      });
    });

    it("should redirect legacy ?section= query params to new paths", async () => {
      render(null, { wrapper: makeWrapper(["/settings?section=pipeline"]) });

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /pipeline stages/i })).toBeInTheDocument();
      });
    });

    it("should render agent profile section at /settings/agent-profile", async () => {
      render(null, { wrapper: makeWrapper(["/settings/agent-profile"]) });

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /agent profile/i })).toBeInTheDocument();
      });
    });
  });

  describe("pipeline stages section", () => {
    it("should render the pipeline stages heading", async () => {
      render(null, { wrapper: makeWrapper(["/settings/stages"]) });

      expect(screen.getByRole("heading", { name: /pipeline stages/i })).toBeInTheDocument();
    });

    it("should render current stages from user profile", async () => {
      render(null, { wrapper: makeWrapper(["/settings/stages"]) });

      await waitFor(() => {
        expect(screen.getByDisplayValue("Applied")).toBeInTheDocument();
      });
      expect(screen.getByDisplayValue("Phone Screen")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Rejected")).toBeInTheDocument();
    });

    it("should show add stage input", async () => {
      render(null, { wrapper: makeWrapper(["/settings/stages"]) });

      await waitFor(() => {
        expect(screen.getByRole("textbox", { name: /new stage name/i })).toBeInTheDocument();
      });
    });

    it("should add a new stage when Add is clicked", async () => {
      render(null, { wrapper: makeWrapper(["/settings/stages"]) });
      await waitFor(() => {
        expect(screen.getByDisplayValue("Applied")).toBeInTheDocument();
      });

      const input = screen.getByRole("textbox", { name: /new stage name/i });
      await userEvent.type(input, "Screening");
      await userEvent.click(screen.getByRole("button", { name: /add stage/i }));

      expect(screen.getByDisplayValue("Screening")).toBeInTheDocument();
    });

    it("should call PATCH /api/auth/me on save", async () => {
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

      render(null, { wrapper: makeWrapper(["/settings/stages"]) });
      await waitFor(() => {
        expect(screen.getByDisplayValue("Applied")).toBeInTheDocument();
      });

      const input = screen.getByRole("textbox", { name: /new stage name/i });
      await userEvent.type(input, "Screening");
      await userEvent.click(screen.getByRole("button", { name: /add stage/i }));
      await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() => {
        expect(patchSpy).toHaveBeenCalledWith({
          default_stages: [...DEFAULT_STAGES, "Screening"],
        });
      });
    });

    it("should show Saved microcopy after saving", async () => {
      render(null, { wrapper: makeWrapper(["/settings/stages"]) });
      await waitFor(() => {
        expect(screen.getByDisplayValue("Applied")).toBeInTheDocument();
      });

      const input = screen.getByRole("textbox", { name: /new stage name/i });
      await userEvent.type(input, "Screening");
      await userEvent.click(screen.getByRole("button", { name: /add stage/i }));
      await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() => {
        expect(screen.getByText("Saved")).toBeInTheDocument();
      });
    });
  });
});
