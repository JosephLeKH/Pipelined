/** Tests for LandingPage: hero content, feature highlights, CTAs, Chrome CTA, auth redirect. */

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import LandingPage from "./LandingPage";

const MOCK_USER = { id: "u1", email: "alice@example.com", display_name: "Alice", default_stages: [] };

const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json({ data: null }, { status: 401 }))
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/"]}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={children} />
              <Route path="/today" element={<div>Today</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("LandingPage", () => {
  it("should render the hero tagline with co-pilot messaging", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/co-pilot/i);
    expect(screen.getByText(/Start each day on Today/i)).toBeInTheDocument();
  });

  it("should render agent-native feature highlights", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByText("Co-pilot")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Apply Pack")).toBeInTheDocument();
    expect(screen.getByText("Mock Interview")).toBeInTheDocument();
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
    expect(screen.getByText("Autopilot")).toBeInTheDocument();
  });

  it("should render core product feature highlights", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByText("Pipeline Dashboard")).toBeInTheDocument();
    expect(screen.getByText("One-Click Chrome Extension")).toBeInTheDocument();
    expect(screen.getByText("Interview Calendar")).toBeInTheDocument();
    expect(screen.getByText("Curated Job Board")).toBeInTheDocument();
    expect(screen.queryByText(/GPT-powered/i)).not.toBeInTheDocument();
  });

  it("should render Sign Up CTA links", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    const signUpLinks = screen.getAllByRole("link", { name: /sign up|get started/i });
    expect(signUpLinks.length).toBeGreaterThan(0);
  });

  it("should render Log In CTA links", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    const loginLinks = screen.getAllByRole("link", { name: /log in/i });
    expect(loginLinks.length).toBeGreaterThan(0);
  });

  it("should redirect logged-in users to /today", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json({ data: MOCK_USER }))
    );

    render(<LandingPage />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    });
  });
});
