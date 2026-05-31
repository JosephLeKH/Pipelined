/** Email verification confirmation page — reads ?token= from URL and verifies on mount. */

import { useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

import Check from "lucide-react/dist/esm/icons/check";
import Loader from "lucide-react/dist/esm/icons/loader";
import X from "lucide-react/dist/esm/icons/x";
import { useVerifyEmail } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import { AUTH_HEADLINE, AUTH_SUBHEAD } from "../lib/authFormStyles";
import { Button } from "../components/ui/button";

function VerifyingState() {
  return (
    <>
      <Loader className="mb-6 h-6 w-6 motion-safe:animate-spin text-brand-600" aria-hidden="true" />
      <h1 className={AUTH_HEADLINE}>Verifying your email…</h1>
      <p className={AUTH_SUBHEAD}>Just a moment.</p>
    </>
  );
}

function SuccessState({ onContinue }) {
  return (
    <>
      <Check className="mb-6 h-6 w-6 text-status-success" aria-hidden="true" />
      <h1 className={AUTH_HEADLINE}>You&apos;re all set.</h1>
      <p className={`${AUTH_SUBHEAD} mb-6`}>
        Your email is verified.
      </p>
      <Button type="button" size="lg" className="w-full" onClick={onContinue}>
        Continue to Today
      </Button>
    </>
  );
}

function ErrorState({ errorCode }) {
  const isExpired = errorCode === "TOKEN_EXPIRED";

  return (
    <>
      <X className="mb-6 h-6 w-6 text-brand-700" aria-hidden="true" />
      <h1 className={AUTH_HEADLINE}>
        {isExpired ? "This link expired." : "Invalid link"}
      </h1>
      <p className={`${AUTH_SUBHEAD} mb-6`}>
        {isExpired
          ? "Request a new verification email below."
          : "This verification link is not valid. It may have already been used."}
      </p>
      <Button asChild size="lg" className="w-full">
        <Link to="/verify-email">Send a new link</Link>
      </Button>
    </>
  );
}

function MissingTokenState() {
  return (
    <>
      <X className="mb-6 h-6 w-6 text-brand-700" aria-hidden="true" />
      <h1 className={AUTH_HEADLINE}>Missing token</h1>
      <p className={`${AUTH_SUBHEAD} mb-6`}>
        No verification token was found in this link.
      </p>
      <Button asChild size="lg" className="w-full">
        <Link to="/verify-email">Send a new link</Link>
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


  const errorCode = error?.code;

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center">
        {isPending && <VerifyingState />}
        {isSuccess && <SuccessState onContinue={() => navigate("/today", { replace: true })} />}
        {isError && <ErrorState errorCode={errorCode} />}
        {!token && !isPending && !isSuccess && !isError && <MissingTokenState />}
      </div>
    </AuthLayout>
  );
}

export default VerifyEmailConfirm;
