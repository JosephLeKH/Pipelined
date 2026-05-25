/** Register page: split-screen layout with brand panel and sign-up form. */

import { Link } from "react-router-dom";

import AuthLayout from "../components/AuthLayout";
import GoogleAuthButton from "../components/GoogleAuthButton";
import GithubAuthButton from "../components/GithubAuthButton";
import { RegisterForm } from "../components/RegisterForm";
import { useRegisterForm } from "../hooks/useRegisterForm";

function Register() {
  const {
    displayName, setDisplayName, email, setEmail, password, setPassword,
    error, isPending, handleSubmit, handleGoogleSuccess, handleGoogleError,
  } = useRegisterForm();

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Create your account</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">Start tracking your job search in under a minute.</p>

      <div className="space-y-3">
        <GoogleAuthButton label="Sign up with Google" onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
        <GithubAuthButton label="Sign up with GitHub" />
      </div>

      <div className="my-7 flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          or sign up with email
        </span>
        <hr className="flex-1 border-border" />
      </div>

      <RegisterForm
        displayName={displayName} setDisplayName={setDisplayName}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        error={error} isPending={isPending} onSubmit={handleSubmit}
      />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:text-primary/80">Log in</Link>
      </p>
    </AuthLayout>
  );
}

export default Register;
