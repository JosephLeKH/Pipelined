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
      <h1 className="font-display text-xl font-semibold text-foreground">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Start tracking your job search today</p>
      <GoogleAuthButton label="Sign up with Google" onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
      <div className="mt-3">
        <GithubAuthButton label="Sign up with GitHub" />
      </div>
      <div className="my-5 flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <hr className="flex-1 border-border" />
      </div>
      <RegisterForm
        displayName={displayName} setDisplayName={setDisplayName}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        error={error} isPending={isPending} onSubmit={handleSubmit}
      />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:text-primary/80 text-sm">Log in</Link>
      </p>
    </AuthLayout>
  );
}

export default Register;
