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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">Sign in to your account</p>
      <GoogleAuthButton label="Continue with Google" onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
      <div className="mt-3">
        <GithubAuthButton label="Continue with GitHub" />
      </div>
      <div className="my-5 flex items-center gap-3">
        <hr className="flex-1 border-gray-200 dark:border-gray-700" />
        <span className="text-xs text-gray-400">or</span>
        <hr className="flex-1 border-gray-200 dark:border-gray-700" />
      </div>
      <LoginForm
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        error={error} isPending={isPending} onSubmit={handleSubmit}
      />
      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">Sign up</Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
