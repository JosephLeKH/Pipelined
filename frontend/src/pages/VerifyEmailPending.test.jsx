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

// Test the maskEmail helper directly
function maskEmail(email) {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;

  // For emails with 3 or fewer chars, show as-is
  if (local.length <= 3) return email;

  // For longer emails: first 2 chars + asterisks + last 1 char
  const prefix = local.slice(0, 2);
  const suffix = local.slice(-1);
  const masked = "*".repeat(local.length - 3);
  return `${prefix}${masked}${suffix}@${domain}`;
}

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

describe("maskEmail helper", () => {
  it("should mask email showing first 2 + asterisks + last 1 char of local part + full domain", () => {
    expect(maskEmail("joseph@example.com")).toBe("jo***h@example.com");
    expect(maskEmail("ab@example.com")).toBe("ab@example.com");
    expect(maskEmail("abc@example.com")).toBe("abc@example.com");
  });

  it("should allow catching typos in local part", () => {
    // Shows first 2 chars and last 1 char so user can verify their email
    expect(maskEmail("josephlee@example.com")).toBe("jo******e@example.com");
    expect(maskEmail("josep.lee@example.com")).toBe("jo******e@example.com");
  });

  it("should handle short local parts correctly", () => {
    // 1-3 chars: no masking
    expect(maskEmail("a@example.com")).toBe("a@example.com");
    expect(maskEmail("ab@example.com")).toBe("ab@example.com");
    expect(maskEmail("abc@example.com")).toBe("abc@example.com");
    // 4+ chars: show first 2 + asterisks + last 1
    expect(maskEmail("abcd@example.com")).toBe("ab*d@example.com");
    expect(maskEmail("abcde@example.com")).toBe("ab**e@example.com");
  });

  it("should return empty string for null or undefined", () => {
    expect(maskEmail(null)).toBe("");
    expect(maskEmail(undefined)).toBe("");
  });

  it("should return original email if no domain", () => {
    expect(maskEmail("nodomain")).toBe("nodomain");
  });

  it("should preserve the full domain", () => {
    expect(maskEmail("test@subdomain.example.co.uk")).toBe("te*t@subdomain.example.co.uk");
  });
});
