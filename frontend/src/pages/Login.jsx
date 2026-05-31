/** Login page: centered layout with OAuth, email/password sign-in, and signup link. */

import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import X from "lucide-react/dist/esm/icons/x";

import AuthLayout from "../components/AuthLayout";
import GoogleAuthButton from "../components/GoogleAuthButton";
import GithubAuthButton from "../components/GithubAuthButton";
import { LoginForm } from "../components/LoginForm";
import { useLoginForm } from "../hooks/useLoginForm";
import { AUTH_HEADLINE, AUTH_SUBHEAD } from "../lib/authFormStyles";

const ERROR_MESSAGES = {
  github_state_invalid: "GitHub authentication failed due to an invalid request state.",
  github_oauth_denied: "GitHub authentication was denied. Please try again.",
  github_email_unavailable: "Your GitHub email is not publicly available. Make it public and try again.",
  github_missing_code: "GitHub authentication failed. Please try again.",
  github_auth_failed: "GitHub authentication failed. Please try again.",
};

function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [queryError, setQueryError] = useState("");
  const {
    email, setEmail, password, setPassword,
    error, isPending, handleSubmit, handleGoogleSuccess, handleGoogleError,
  } = useLoginForm();

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      setQueryError(ERROR_MESSAGES[errorCode]);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const displayError = queryError || error;

  return (
    <AuthLayout>
      <div className="flex flex-col">
        <div className="order-1">
          <h1 className={AUTH_HEADLINE}>Welcome back</h1>
          <p className={`${AUTH_SUBHEAD} mb-8`}>Log in to keep your search moving</p>
        </div>

        {queryError && (
          <div className="order-2.5 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 flex items-start justify-between">
            <p className="text-sm text-red-800">{queryError}</p>
            <button
              onClick={() => setQueryError("")}
              className="text-red-600 hover:text-red-700"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="order-4">
          <LoginForm
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            error={error} isPending={isPending} onSubmit={handleSubmit}
          />
        </div>

        <p className="order-5 mt-6 text-center text-[0.8125rem] text-text-2">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-brand-600 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
          >
            Sign up
          </Link>
        </p>

        <div className="order-2 space-y-2">
          <GoogleAuthButton label="Continue with Google" onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          <GithubAuthButton label="Continue with GitHub" />
        </div>

        <div className="order-3 my-6 flex items-center gap-3">
          <hr className="flex-1 border-border-2" />
          <span className="text-[0.6875rem] font-medium text-text-3">or with email</span>
          <hr className="flex-1 border-border-2" />
        </div>
      </div>
    </AuthLayout>
  );
}

export default Login;
