/** Login page: split-screen layout with brand panel and email/password sign-in form. */

import { Link } from "react-router-dom";

import AuthLayout from "../components/AuthLayout";
import GoogleAuthButton from "../components/GoogleAuthButton";
import GithubAuthButton from "../components/GithubAuthButton";
import { LoginForm } from "../components/LoginForm";
import { useLoginForm } from "../hooks/useLoginForm";

function Login() {
  const {
    email, setEmail, password, setPassword,
    error, isPending, handleSubmit, handleGoogleSuccess, handleGoogleError,
  } = useLoginForm();

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">Sign in to your account to continue.</p>

      <div className="space-y-3">
        <GoogleAuthButton label="Continue with Google" onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
        <GithubAuthButton label="Continue with GitHub" />
      </div>

      <div className="my-7 flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          or continue with email
        </span>
        <hr className="flex-1 border-border" />
      </div>

      <LoginForm
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        error={error} isPending={isPending} onSubmit={handleSubmit}
      />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-primary hover:text-primary/80">Sign up</Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
