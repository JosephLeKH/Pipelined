/** GitHub OAuth callback page: exchanges the code for a session and redirects. */

import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { useAuth } from "../context/AuthContext";
import { useGithubAuth } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";

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
    <AuthLayout>
      <div
        className="flex flex-col items-center text-center"
        role="status"
        aria-live="polite"
        aria-label="Authenticating with GitHub"
      >
        <Loader2 className="mb-4 h-6 w-6 animate-spin motion-safe:animate-spin text-brand-600" aria-hidden="true" />
        <p className="text-sm text-text-2">Signing you in…</p>
      </div>
    </AuthLayout>
  );
}

export default GithubCallback;
