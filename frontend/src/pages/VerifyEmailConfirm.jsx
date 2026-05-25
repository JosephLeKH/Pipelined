/** Email verification confirmation page — reads ?token= from URL and verifies on mount. */

import { useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import Loader from "lucide-react/dist/esm/icons/loader";
import { useVerifyEmail } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import { Button } from "../components/ui/button";

const REDIRECT_DELAY_MS = 2000;

function VerifyingState() {
  return (
    <>
      <Loader className="mb-5 h-12 w-12 animate-spin text-primary" />
      <h1 className=" text-2xl font-bold text-foreground">Verifying your email…</h1>
      <p className="mt-2 text-sm text-muted-foreground">Just a moment.</p>
    </>
  );
}

function SuccessState() {
  return (
    <>
      <CheckCircle className="mb-5 h-12 w-12 text-primary" />
      <h1 className=" text-2xl font-bold text-foreground">Email verified!</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your account is now active. Redirecting to your dashboard…
      </p>
    </>
  );
}

function ErrorState({ errorCode }) {
  return (
    <>
      <XCircle className="mb-5 h-12 w-12 text-destructive" />
      <h1 className=" text-2xl font-bold text-foreground">
        {errorCode === "TOKEN_EXPIRED" ? "Link expired" : "Invalid link"}
      </h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        {errorCode === "TOKEN_EXPIRED"
          ? "This verification link has expired. Request a new one below."
          : "This verification link is not valid. It may have already been used."}
      </p>
      <Button asChild className="w-full">
        <Link to="/verify-email">Request a new link</Link>
      </Button>
    </>
  );
}

function MissingTokenState() {
  return (
    <>
      <XCircle className="mb-5 h-12 w-12 text-destructive" />
      <h1 className=" text-2xl font-bold text-foreground">Missing token</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        No verification token was found in this link.
      </p>
      <Button asChild className="w-full">
        <Link to="/verify-email">Request a new link</Link>
      </Button>
    </>
  );
}

function VerifyEmailConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const { mutateAsync: verify, isPending, isSuccess, isError, error } = useVerifyEmail();
  const called = useRef(false);

  useEffect(() => {
    if (!token || called.current) return;
    called.current = true;
    verify({ token }).catch(() => {});
  }, [token, verify]);

  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => navigate("/today", { replace: true }), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isSuccess, navigate]);

  const errorCode = error?.code;

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center">
        {isPending && <VerifyingState />}
        {isSuccess && <SuccessState />}
        {isError && <ErrorState errorCode={errorCode} />}
        {!token && <MissingTokenState />}
      </div>
    </AuthLayout>
  );
}

export default VerifyEmailConfirm;
