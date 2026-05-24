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
              <Route path="/dashboard" element={<div>Dashboard</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("LandingPage", () => {
  it("should render the hero tagline", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("should render Pipeline Dashboard feature highlight", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByText("Pipeline Dashboard")).toBeInTheDocument();
  });

  it("should render AI feature highlights with assistive copy", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByText("Morning Brief")).toBeInTheDocument();
    expect(screen.getByText("Autopilot")).toBeInTheDocument();
    expect(screen.getByText("Resume Insights")).toBeInTheDocument();
    expect(screen.getByText("Interview Prep Agent")).toBeInTheDocument();
    expect(screen.getByText("Gmail Sync")).toBeInTheDocument();
    expect(screen.queryByText(/GPT-powered/i)).not.toBeInTheDocument();
  });

  it("should render One-Click Chrome Extension feature highlight", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByText("One-Click Chrome Extension")).toBeInTheDocument();
  });

  it("should render Interview Calendar feature highlight", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByText("Interview Calendar")).toBeInTheDocument();
  });

  it("should render Curated Job Board feature highlight", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByText("Curated Job Board")).toBeInTheDocument();
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

  it("should redirect logged-in users to /dashboard", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json({ data: MOCK_USER }))
    );

    render(<LandingPage />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
