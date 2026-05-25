/** Tests for LandingPage: hero, numbered sections, CTAs, auth redirect. */

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
  it("should render the hero headline and subhead", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/pipeline for/i);
    expect(screen.getByText(/Capture every application from one-click save/i)).toBeInTheDocument();
  });

  it("should render numbered product sections", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByRole("heading", { name: /capture every job in one click/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /know what to do this morning/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /draft a great application/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /rehearse before the real call/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /see where time goes/i })).toBeInTheDocument();
  });

  it("should render trust and compliance copy", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    expect(screen.getByText(/No auto-send — you copy, you send/i)).toBeInTheDocument();
    expect(screen.getByText(/Loved by students at top CS programs/i)).toBeInTheDocument();
  });

  it("should render Sign Up CTA links", () => {
    render(<LandingPage />, { wrapper: makeWrapper() });

    const signUpLinks = screen.getAllByRole("link", { name: /sign up/i });
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
      expect(screen.getByText("Today")).toBeInTheDocument();
    });
  });
});
