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
      <h1 className="font-display text-xl font-semibold text-gray-900">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">Start tracking your job search today</p>
      <GoogleAuthButton label="Sign up with Google" onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
      <div className="mt-3">
        <GithubAuthButton label="Sign up with GitHub" />
      </div>
      <div className="my-5 flex items-center gap-3">
        <hr className="flex-1 border-gray-200 dark:border-gray-700" />
        <span className="text-xs text-gray-400">or</span>
        <hr className="flex-1 border-gray-200 dark:border-gray-700" />
      </div>
      <RegisterForm
        displayName={displayName} setDisplayName={setDisplayName}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        error={error} isPending={isPending} onSubmit={handleSubmit}
      />
      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{" "}
        <Link to="/login" className="text-brand-500 hover:text-brand-600 text-sm">Log in</Link>
      </p>
    </AuthLayout>
  );
}

export default Register;
