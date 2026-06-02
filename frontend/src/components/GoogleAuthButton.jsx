/** Google Identity Services sign-in button for OAuth authentication. */

import { useEffect, useCallback } from "react";

import { useGoogleAuth } from "../hooks/useAuth";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
      />
      <path
        fill="#34A853"
        d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"
      />
      <path
        fill="#FBBC05"
        d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.14z"
      />
      <path
        fill="#EA4335"
        d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A8 8 0 0 0 1.83 5.43L4.5 7.5c.68-2.01 2.56-3.92 4.48-3.92z"
      />
    </svg>
  );
}

function GoogleAuthButton({ label = "Continue with Google", onSuccess, onError }) {
  const { mutateAsync: googleSignIn } = useGoogleAuth();
  const { login } = useAuth();

  const handleCredential = useCallback(
    async (response) => {
      try {
        const user = await googleSignIn({ id_token: response.credential });
        login(user);
        onSuccess(user);
      } catch (err) {
        const serverMessage = err?.response?.data?.detail?.message;
        onError(serverMessage ?? err?.message ?? "Google sign-in failed.");
      }
    },
    [googleSignIn, login, onSuccess, onError]
  );

  useEffect(() => {
    if (!window.google || !GOOGLE_CLIENT_ID) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
    });
  }, [handleCredential]);

  const handleClick = useCallback(() => {
    if (!window.google) return;
    window.google.accounts.id.prompt();
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleClick}
      className="h-9 w-full gap-3 border-border-2 bg-surface-0 text-text-1 hover:bg-surface-1"
      data-testid="google-auth-button"
    >
      <GoogleIcon />
      {label}
    </Button>
  );
}

export default GoogleAuthButton;
