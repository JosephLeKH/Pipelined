/** Gmail OAuth callback — backend handles this flow now; redirect any stray hits to settings. */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function GmailCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/settings?section=integrations", { replace: true });
  }, [navigate]);

  return null;
}

export default GmailCallback;
