/** Tests for GithubCallback: exchanges OAuth code, handles errors, and navigates. */

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import GithubCallback from "./GithubCallback";
import Login from "./Login";

const MOCK_USER = {
  id: "u-gh1",
  email: "octocat@github.com",
  display_name: "The Octocat",
  default_stages: [],
};

const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json({ data: null }, { status: 401 })),
  http.post("/api/auth/github", async ({ request }) => {
    const body = await request.json();
    if (body.code === "valid-code") {
      return HttpResponse.json({ data: MOCK_USER });
    }
    return HttpResponse.json(
      { error: { code: "INVALID_GITHUB_CODE", message: "GitHub authentication failed." } },
      { status: 401 }
    );
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeWrapper(code = "valid-code") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const initialPath = code ? `/auth/github/callback?code=${code}` : "/auth/github/callback";
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialPath]}>
          <AuthProvider>
            <Routes>
              <Route path="/auth/github/callback" element={children} />
              <Route path="/today" element={<div>Today</div>} />
              <Route path="/login" element={<div>Login</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("GithubCallback", () => {
  it("should show loading spinner while exchanging code", () => {
    const { container } = render(<GithubCallback />, { wrapper: makeWrapper("valid-code") });

    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("should redirect to today on successful code exchange", async () => {
    render(<GithubCallback />, { wrapper: makeWrapper("valid-code") });

    await waitFor(() => {
      expect(screen.getByText("Today")).toBeInTheDocument();
    });
  });

  it("should redirect to login with error when code exchange fails", async () => {
    render(<GithubCallback />, { wrapper: makeWrapper("bad-code") });

    await waitFor(() => {
      expect(screen.getByText("Login")).toBeInTheDocument();
    });
  });

  it("should redirect to login with error when code is missing from URL", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function NoCodeWrapper({ children }) {
      return (
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={["/auth/github/callback"]}>
            <AuthProvider>
              <Routes>
                <Route path="/auth/github/callback" element={children} />
                <Route path="/login" element={<div>Login</div>} />
              </Routes>
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );
    }

    render(<GithubCallback />, { wrapper: NoCodeWrapper });

    await waitFor(() => {
      expect(screen.getByText("Login")).toBeInTheDocument();
    });
  });

});
