/** Tests for Login page: form rendering, validation, submit, error handling, redirect. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import Login from "./Login";

const MOCK_USER = { id: "u1", email: "alice@example.com", display_name: "Alice", default_stages: [] };

const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json({ data: null }, { status: 401 })),
  http.post("/api/auth/login", async ({ request }) => {
    const body = await request.json();
    if (body.email === "alice@example.com" && body.password === "password123") {
      return HttpResponse.json({ data: MOCK_USER });
    }
    return HttpResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Incorrect email or password." } },
      { status: 401 }
    );
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/login"]}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={children} />
              <Route path="/dashboard" element={<div>Dashboard</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("Login", () => {
  it("should render email field, password field, and sign-in button", () => {
    render(<Login />, { wrapper: makeWrapper() });

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("should render Google sign-in button", () => {
    render(<Login />, { wrapper: makeWrapper() });

    expect(screen.getByTestId("google-auth-button")).toBeInTheDocument();
  });

  it("should render link to register page", () => {
    render(<Login />, { wrapper: makeWrapper() });

    expect(screen.getByRole("link", { name: "Sign up" })).toBeInTheDocument();
  });

  it("should show error when email is empty on submit", async () => {
    render(<Login />, { wrapper: makeWrapper() });

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email is required.");
  });

  it("should show error when password is empty on submit", async () => {
    render(<Login />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Password is required.");
  });

  it("should show error message on invalid credentials", async () => {
    render(<Login />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("Email"), "wrong@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "badpass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  });

  it("should redirect to dashboard on successful login", async () => {
    render(<Login />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
