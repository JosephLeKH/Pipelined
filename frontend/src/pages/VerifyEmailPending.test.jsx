/** Tests for VerifyEmailPending: rendering, resend flow, cooldown, error states. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import VerifyEmailPending from "./VerifyEmailPending";

const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json({ data: null }, { status: 401 })),
  http.post("/api/auth/resend-verification", () =>
    HttpResponse.json({ data: { message: "Verification email resent." } })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }) {
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
  };
}

describe("VerifyEmailPending", () => {
  it("should render check-your-email heading and resend button", () => {
    render(<VerifyEmailPending />, { wrapper: makeWrapper() });

    expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend verification email/i })).toBeInTheDocument();
  });

  it("should show success status after successful resend", async () => {
    render(<VerifyEmailPending />, { wrapper: makeWrapper() });

    await userEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/verification email resent/i);
    });
  });

  it("should disable resend button with countdown after successful resend", async () => {
    render(<VerifyEmailPending />, { wrapper: makeWrapper() });

    await userEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /resend in/i })).toBeDisabled();
    });
  });

  it("should show error status when resend fails", async () => {
    server.use(
      http.post("/api/auth/resend-verification", () =>
        HttpResponse.json({ error: { code: "SERVER_ERROR", message: "error" } }, { status: 500 })
      )
    );

    render(<VerifyEmailPending />, { wrapper: makeWrapper() });

    await userEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/could not resend/i);
    });
  });

  it("should show already-verified message when user is already verified", async () => {
    server.use(
      http.post("/api/auth/resend-verification", () =>
        HttpResponse.json(
          { error: { code: "ALREADY_VERIFIED", message: "Email is already verified." } },
          { status: 400 }
        )
      )
    );

    render(<VerifyEmailPending />, { wrapper: makeWrapper() });

    await userEvent.click(screen.getByRole("button", { name: /resend verification email/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/already verified/i);
    });
  });
});
