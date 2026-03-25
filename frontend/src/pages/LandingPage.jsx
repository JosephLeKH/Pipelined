/** Landing page: public marketing entry point. */

import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Pipelined</h1>
      <p className="text-lg text-gray-600">Track every job application, effortlessly.</p>
      <div className="flex gap-4">
        <Link
          to="/login"
          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Log in
        </Link>
        <Link
          to="/register"
          className="rounded-lg border border-blue-600 px-6 py-2 text-blue-600 hover:bg-blue-50"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}

export default LandingPage;
