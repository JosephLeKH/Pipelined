/** Centered auth layout: wordmark above a single form column on a calm surface. */
import { Link } from "react-router-dom";
import GitBranch from "lucide-react/dist/esm/icons/git-branch";

function AuthWordmark() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 text-lg font-semibold tracking-[-0.022em] text-text-1 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
    >
      <GitBranch className="h-[1.125rem] w-[1.125rem] text-brand-600" aria-hidden="true" />
      Pipelined
    </Link>
  );
}

function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0 px-6 py-12">
      <div className="w-full max-w-[22.5rem]">
        <div className="mb-12 flex justify-center">
          <AuthWordmark />
        </div>
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
