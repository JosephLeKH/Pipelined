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
      <h1 className="font-display text-xl font-semibold text-foreground">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Sign in to your account</p>
      <GoogleAuthButton label="Continue with Google" onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
      <div className="mt-3">
        <GithubAuthButton label="Continue with GitHub" />
      </div>
      <div className="my-5 flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <hr className="flex-1 border-border" />
      </div>
      <LoginForm
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        error={error} isPending={isPending} onSubmit={handleSubmit}
      />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="text-primary hover:text-primary/80 text-sm">Sign up</Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
