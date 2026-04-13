/** Tests for Register page: form rendering, validation, submit, error handling, redirect. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import Register from "./Register";

const MOCK_USER = { id: "u2", email: "bob@example.com", display_name: "Bob", default_stages: [] };

const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json({ data: null }, { status: 401 })),
  http.post("/api/auth/register", async ({ request }) => {
    const body = await request.json();
    if (body.email === "taken@example.com") {
      return HttpResponse.json(
        { error: { code: "DUPLICATE_EMAIL", message: "An account with taken@example.com already exists." } },
        { status: 409 }
      );
    }
    return HttpResponse.json({ data: { ...MOCK_USER, email: body.email, display_name: body.display_name } }, { status: 201 });
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
        <MemoryRouter initialEntries={["/register"]}>
          <AuthProvider>
            <Routes>
              <Route path="/register" element={children} />
              <Route path="/dashboard" element={<div>Dashboard</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("Register", () => {
  it("should render name, email, password fields and create account button", () => {
    render(<Register />, { wrapper: makeWrapper() });

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("should render Google sign-up button", () => {
    render(<Register />, { wrapper: makeWrapper() });

    expect(screen.getByTestId("google-auth-button")).toBeInTheDocument();
  });

  it("should render link to login page", () => {
    render(<Register />, { wrapper: makeWrapper() });

    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
  });

  it("should show error when name is empty on submit", async () => {
    render(<Register />, { wrapper: makeWrapper() });

    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("should show error when email is empty on submit", async () => {
    render(<Register />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("Name"), "Bob");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email is required.");
  });

  it("should show error when password is too short", async () => {
    render(<Register />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("Name"), "Bob");
    await userEvent.type(screen.getByLabelText("Email"), "bob@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Password must be at least 8 characters.");
  });

  it("should show error when email is already taken", async () => {
    render(<Register />, { wrapper: makeWrapper() });

    await userEvent.type(screen.getByLabelText("Name"), "Taken");
    await userEvent.type(screen.getByLabelText("Email"), "taken@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An account with taken@example.com already exists."
    );
  });

  it("should redirect to verify-email page on successful registration", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    function WrapperWithVerify({ children }) {
      return (
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={["/register"]}>
            <AuthProvider>
              <Routes>
                <Route path="/register" element={children} />
                <Route path="/verify-email" element={<div>VerifyEmail</div>} />
              </Routes>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );
    }

    render(<Register />, { wrapper: WrapperWithVerify });

    await userEvent.type(screen.getByLabelText("Name"), "Bob");
    await userEvent.type(screen.getByLabelText("Email"), "bob@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("VerifyEmail")).toBeInTheDocument();
    });
  });
});
