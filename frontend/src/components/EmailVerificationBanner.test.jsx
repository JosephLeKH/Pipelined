/** Tests for EmailVerificationBanner: shows for unverified users, hides on dismiss,
 *  fires resend, shows on EMAIL_NOT_VERIFIED event.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

import { AuthContext } from "../context/AuthContext";
import EmailVerificationBanner, { EMAIL_NOT_VERIFIED_EVENT } from "./EmailVerificationBanner";

const server = setupServer(
  http.post("/api/auth/resend-verification", () =>
    HttpResponse.json({ data: { message: "Verification email resent." } })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper(user = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const authValue = {
    user,
    isInitialized: true,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  };
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AuthContext.Provider value={authValue}>
            {children}
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("EmailVerificationBanner", () => {
  it("should not render when user is null", () => {
    render(<EmailVerificationBanner />, { wrapper: makeWrapper(null) });

    expect(screen.queryByTestId("email-verification-banner")).not.toBeInTheDocument();
  });

  it("should not render when user is verified", () => {
    render(<EmailVerificationBanner />, {
      wrapper: makeWrapper({ id: "u1", email: "a@b.com", email_verified: true }),
    });

    expect(screen.queryByTestId("email-verification-banner")).not.toBeInTheDocument();
  });

  it("should render when user is unverified", () => {
    render(<EmailVerificationBanner />, {
      wrapper: makeWrapper({ id: "u1", email: "a@b.com", email_verified: false }),
    });

    expect(screen.getByTestId("email-verification-banner")).toBeInTheDocument();
    expect(screen.getByText(/please verify your email/i)).toBeInTheDocument();
  });

  it("should hide banner when dismissed", () => {
    render(<EmailVerificationBanner />, {
      wrapper: makeWrapper({ id: "u1", email: "a@b.com", email_verified: false }),
    });

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(screen.queryByTestId("email-verification-banner")).not.toBeInTheDocument();
  });

  it("should show sent message after clicking resend", async () => {
    render(<EmailVerificationBanner />, {
      wrapper: makeWrapper({ id: "u1", email: "a@b.com", email_verified: false }),
    });

    await userEvent.click(screen.getByRole("button", { name: /resend email/i }));

    await waitFor(() => {
      expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
    });
  });

  it("should appear when EMAIL_NOT_VERIFIED_EVENT is dispatched", () => {
    render(<EmailVerificationBanner />, { wrapper: makeWrapper(null) });

    expect(screen.queryByTestId("email-verification-banner")).not.toBeInTheDocument();

    fireEvent(window, new CustomEvent(EMAIL_NOT_VERIFIED_EVENT));

    expect(screen.getByTestId("email-verification-banner")).toBeInTheDocument();
  });
});
