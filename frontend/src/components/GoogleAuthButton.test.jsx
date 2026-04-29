import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GoogleAuthButton from "./GoogleAuthButton";

vi.mock("../hooks/useAuth", () => ({
  useGoogleAuth: vi.fn(),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useGoogleAuth } from "../hooks/useAuth";
import { useAuth } from "../context/AuthContext";

describe("GoogleAuthButton", () => {
  let mockPrompt;
  let mockInitialize;

  beforeEach(() => {
    vi.clearAllMocks();
    useGoogleAuth.mockReturnValue({ mutateAsync: vi.fn() });
    useAuth.mockReturnValue({ login: vi.fn() });

    mockPrompt = vi.fn();
    mockInitialize = vi.fn();
    window.google = { accounts: { id: { initialize: mockInitialize, prompt: mockPrompt } } };
  });

  afterEach(() => {
    delete window.google;
  });

  it("should render button with default label", () => {
    render(<GoogleAuthButton onSuccess={vi.fn()} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
  });

  it("should render button with custom label", () => {
    render(<GoogleAuthButton label="Sign in with Google" onSuccess={vi.fn()} onError={vi.fn()} />);

    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
  });

  it("should call google.accounts.id.prompt when clicked", () => {
    render(<GoogleAuthButton onSuccess={vi.fn()} onError={vi.fn()} />);

    fireEvent.click(screen.getByRole("button"));

    expect(mockPrompt).toHaveBeenCalledOnce();
  });

  it("should not throw when clicked without window.google", () => {
    delete window.google;

    render(<GoogleAuthButton onSuccess={vi.fn()} onError={vi.fn()} />);

    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
  });

  it("should render button with data-testid google-auth-button", () => {
    render(<GoogleAuthButton onSuccess={vi.fn()} onError={vi.fn()} />);

    expect(screen.getByTestId("google-auth-button")).toBeInTheDocument();
  });
});
