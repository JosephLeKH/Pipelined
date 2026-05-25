/** Register page: centered layout with OAuth, sign-up form, and login link. */

import { Link } from "react-router-dom";

import AuthLayout from "../components/AuthLayout";
import GoogleAuthButton from "../components/GoogleAuthButton";
import GithubAuthButton from "../components/GithubAuthButton";
import { RegisterForm } from "../components/RegisterForm";
import { useRegisterForm } from "../hooks/useRegisterForm";
import { AUTH_HEADLINE, AUTH_SUBHEAD } from "../lib/authFormStyles";

function Register() {
  const {
    displayName, setDisplayName, email, setEmail, password, setPassword,
    error, isPending, handleSubmit, handleGoogleSuccess, handleGoogleError,
  } = useRegisterForm();

  return (
    <AuthLayout>
      <div className="flex flex-col">
        <div className="order-1">
          <h1 className={AUTH_HEADLINE}>Create your account</h1>
          <p className={`${AUTH_SUBHEAD} mb-8`}>Track your job search in one place</p>
        </div>

        <div className="order-4">
          <RegisterForm
            displayName={displayName} setDisplayName={setDisplayName}
            email={email} setEmail={setEmail}
            password={password} setPassword={setPassword}
            error={error} isPending={isPending} onSubmit={handleSubmit}
          />
        </div>

        <div className="order-2 space-y-2">
          <GoogleAuthButton label="Continue with Google" onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          <GithubAuthButton label="Continue with GitHub" />
        </div>

        <div className="order-3 my-6 flex items-center gap-3">
          <hr className="flex-1 border-border-2" />
          <span className="text-[11px] font-medium text-text-3">or with email</span>
          <hr className="flex-1 border-border-2" />
        </div>

        <p className="order-5 mt-6 text-center text-[13px] text-text-2">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
          >
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default Register;
