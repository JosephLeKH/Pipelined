/** Centered card layout used by all auth pages. */

import { CARD_BASE } from "../lib/designTokens";

function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4 py-12">
      <div className={`w-full max-w-sm ${CARD_BASE} px-8 py-10`}>
        <p className="mb-6 font-display font-semibold text-xl text-gray-900">Pipelined</p>
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
