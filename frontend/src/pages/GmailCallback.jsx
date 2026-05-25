/** Gmail OAuth callback — backend handles this flow now; redirect any stray hits to settings. */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import AuthLayout from "../components/AuthLayout";

function GmailCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/settings?section=integrations", { replace: true });
  }, [navigate]);

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
        <Loader2 className="mb-4 h-6 w-6 motion-safe:animate-spin text-brand-600" aria-hidden="true" />
        <p className="text-sm text-text-2">Connecting Gmail…</p>
        <span className="sr-only">Connecting Gmail…</span>
      </div>
    </AuthLayout>
  );
}

export default GmailCallback;
