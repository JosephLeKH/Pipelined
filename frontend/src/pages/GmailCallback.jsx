/** Gmail OAuth callback — backend handles this flow now; redirect any stray hits to settings. */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";

function GmailCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/settings?section=integrations", { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Connecting Gmail…</span>
    </div>
  );
}

export default GmailCallback;
