/** Tests for AuthContext: provider, useAuth hook, user state transitions. */

import { render, screen, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";

function UserDisplay() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.email : "null"}</span>
      <button onClick={() => login({ email: "test@example.com" })}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  it("should expose null user by default", () => {
    render(
      <AuthProvider>
        <UserDisplay />
      </AuthProvider>
    );

    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("should update user state after login", async () => {
    render(
      <AuthProvider>
        <UserDisplay />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByRole("button", { name: "login" }).click();
    });

    expect(screen.getByTestId("user").textContent).toBe("test@example.com");
  });

  it("should reset user to null after logout", async () => {
    render(
      <AuthProvider>
        <UserDisplay />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByRole("button", { name: "login" }).click();
    });

    await act(async () => {
      screen.getByRole("button", { name: "logout" }).click();
    });

    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("should throw when useAuth is called outside AuthProvider", () => {
    const originalError = console.error;
    console.error = () => {};

    function BadConsumer() {
      useAuth();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );

    console.error = originalError;
  });
});
