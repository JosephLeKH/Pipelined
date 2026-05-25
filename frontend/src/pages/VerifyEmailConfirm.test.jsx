/** Tests for VerifyEmailConfirm: loading state, success, expired token, invalid token, missing token. */

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import VerifyEmailConfirm from "./VerifyEmailConfirm";

const VALID_TOKEN = "validtoken123";

const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json({ data: null }, { status: 401 })),
  http.post("/api/auth/verify-email", async ({ request }) => {
    const body = await request.json();
    if (body.token === VALID_TOKEN) {
      return HttpResponse.json({ data: { message: "Email verified" } });
    }
    if (body.token === "expired-token") {
      return HttpResponse.json(
        { error: { code: "TOKEN_EXPIRED", message: "Verification token has expired." } },
        { status: 400 }
      );
    }
    return HttpResponse.json(
      { error: { code: "TOKEN_INVALID", message: "Invalid verification token." } },
      { status: 400 }
    );
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper(token = VALID_TOKEN) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[`/verify-email?token=${token}`]}>
          <AuthProvider>
            <Routes>
              <Route path="/verify-email" element={children} />
              <Route path="/dashboard" element={<div>Dashboard</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("VerifyEmailConfirm", () => {
  it("should show success heading after valid token verification", async () => {
    render(<VerifyEmailConfirm />, { wrapper: makeWrapper(VALID_TOKEN) });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /you're all set/i })).toBeInTheDocument();
    });
  });

  it("should show expired-link heading for TOKEN_EXPIRED error", async () => {
    render(<VerifyEmailConfirm />, { wrapper: makeWrapper("expired-token") });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /link expired/i })).toBeInTheDocument();
    });
  });

  it("should show invalid-link heading for TOKEN_INVALID error", async () => {
    render(<VerifyEmailConfirm />, { wrapper: makeWrapper("bad-token") });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /invalid link/i })).toBeInTheDocument();
    });
  });

  it("should render request-new-link button on error", async () => {
    render(<VerifyEmailConfirm />, { wrapper: makeWrapper("expired-token") });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /send a new link/i })).toBeInTheDocument();
    });
  });

  it("should show missing-token heading when no token in URL", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    function NoTokenWrapper({ children }) {
      return (
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={["/verify-email"]}>
            <AuthProvider>
              <Routes>
                <Route path="/verify-email" element={children} />
              </Routes>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );
    }

    render(<VerifyEmailConfirm />, { wrapper: NoTokenWrapper });

    expect(screen.getByRole("heading", { name: /missing token/i })).toBeInTheDocument();
  });
});
