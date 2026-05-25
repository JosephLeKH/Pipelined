/** Modal shown when an API call returns TIER_LIMIT_EXCEEDED (403).
 *  Listens for the pipelined:tier_limit_exceeded custom event dispatched by client.js.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Zap from "lucide-react/dist/esm/icons/zap";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
} from "./ui/dialog";

export const TIER_LIMIT_EXCEEDED_EVENT = "pipelined:tier_limit_exceeded";

const RESOURCE_LABELS = {
  max_applications: "Applications",
  max_contacts: "Contacts",
  max_saved_searches: "Saved Searches",
  max_csv_import_rows: "CSV Import Rows",
  ai_fit_scores_per_day: "AI Fit Scores / day",
};

function UpgradePlanModal() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [limitDetails, setLimitDetails] = useState(null);

  useEffect(() => {
    function onTierLimitExceeded(e) {
      setLimitDetails(e.detail ?? null);
      setVisible(true);
    }
    window.addEventListener(TIER_LIMIT_EXCEEDED_EVENT, onTierLimitExceeded);
    return () => window.removeEventListener(TIER_LIMIT_EXCEEDED_EVENT, onTierLimitExceeded);
  }, []);

  const handleDismiss = useCallback(() => setVisible(false), []);

  const handleUpgrade = useCallback(() => {
    setVisible(false);
    navigate("/pricing");
  }, [navigate]);

  const resourceLabel = limitDetails?.limit_name
    ? (RESOURCE_LABELS[limitDetails.limit_name] ?? limitDetails.limit_name)
    : null;

  return (
    <Dialog open={visible} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <Zap className="h-8 w-8 text-primary" />

          <div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              You&apos;ve reached a free plan limit
            </h2>
            {resourceLabel && limitDetails?.current_usage != null && limitDetails?.max_allowed != null && (
              <p className="mb-1 text-sm font-medium text-muted-foreground">
                {resourceLabel}: {limitDetails.current_usage} / {limitDetails.max_allowed}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Upgrade to Pro for unlimited access to all features.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <Button type="button" onClick={handleUpgrade} autoFocus className="w-full">
              Upgrade to Pro
            </Button>
            <Button type="button" variant="outline" onClick={handleDismiss} className="w-full">
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradePlanModal;
