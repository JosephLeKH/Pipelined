/** GitHub OAuth callback page: exchanges the code for a session and redirects. */

import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useGithubAuth } from "../hooks/useAuth";

function GithubCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { mutateAsync: signInWithGithub } = useGithubAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const code = searchParams.get("code");
    if (!code) {
      navigate("/login?error=github_missing_code", { replace: true });
      return;
    }

    signInWithGithub({ code })
      .then((user) => {
        login(user);
        navigate("/today", { replace: true });
      })
      .catch(() => {
        navigate("/login?error=github_auth_failed", { replace: true });
      });
  }, [searchParams, signInWithGithub, login, navigate]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Authenticating with GitHub"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  );
}

export default GithubCallback;
