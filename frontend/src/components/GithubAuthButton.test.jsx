/** Tests for GithubAuthButton: visibility controlled by VITE_GITHUB_CLIENT_ID. */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("GithubAuthButton", () => {
  it("should not render when VITE_GITHUB_CLIENT_ID is not set", async () => {
    vi.stubEnv("VITE_GITHUB_CLIENT_ID", "");
    vi.resetModules();

    const { default: GithubAuthButton } = await import("./GithubAuthButton");

    render(<GithubAuthButton />);

    expect(screen.queryByTestId("github-auth-button")).toBeNull();
  });

  it("should render button when VITE_GITHUB_CLIENT_ID is set", async () => {
    vi.stubEnv("VITE_GITHUB_CLIENT_ID", "test-client-id");
    vi.resetModules();

    const { default: GithubAuthButton } = await import("./GithubAuthButton");

    render(<GithubAuthButton />);

    expect(screen.getByTestId("github-auth-button")).toBeInTheDocument();
  });

  it("should render custom label", async () => {
    vi.stubEnv("VITE_GITHUB_CLIENT_ID", "test-client-id");
    vi.resetModules();

    const { default: GithubAuthButton } = await import("./GithubAuthButton");

    render(<GithubAuthButton label="Sign up with GitHub" />);

    expect(screen.getByText("Sign up with GitHub")).toBeInTheDocument();
  });

  it("should redirect to GitHub on click", async () => {
    vi.stubEnv("VITE_GITHUB_CLIENT_ID", "test-client-id");
    vi.resetModules();

    const { default: GithubAuthButton } = await import("./GithubAuthButton");

    const hrefSetter = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, set href(val) { hrefSetter(val); } },
    });

    render(<GithubAuthButton />);
    screen.getByTestId("github-auth-button").click();

    expect(hrefSetter).toHaveBeenCalledWith(
      expect.stringContaining("github.com/login/oauth/authorize")
    );
    expect(hrefSetter).toHaveBeenCalledWith(
      expect.stringContaining("client_id=test-client-id")
    );
  });
});
