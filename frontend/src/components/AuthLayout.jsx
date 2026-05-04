/** Centered card layout used by all auth pages. */
import { Link } from 'react-router-dom';

function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card text-card-foreground shadow-sm px-8 py-10">
        <Link to="/" className="mb-6 block font-display font-semibold text-xl text-foreground no-underline">Pipelined</Link>
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
