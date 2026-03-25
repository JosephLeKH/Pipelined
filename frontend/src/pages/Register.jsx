/** Register page: email/password and Google OAuth sign-up (stub). */

import { Link } from "react-router-dom";

function Register() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-xl border p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold">Sign up</h1>
        <p className="text-sm text-gray-500">Registration form coming in US-011.</p>
        <p className="mt-4 text-sm">
          Have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default Register;
