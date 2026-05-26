/** Modal shown when an API call returns TIER_LIMIT_EXCEEDED (403).
 *  Listens for the pipelined:tier_limit_exceeded custom event dispatched by client.js.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Sparkles from "lucide-react/dist/esm/icons/sparkles";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
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

  const showUsage =
    resourceLabel &&
    limitDetails?.current_usage != null &&
    limitDetails?.max_allowed != null;

  return (
    <Dialog open={visible} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="max-w-[30rem] gap-0 p-6">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <Sparkles className="h-8 w-8 text-brand-600 dark:text-brand-400" aria-hidden="true" />

          <DialogTitle className="text-base font-semibold text-text-1">
            Pipelined Pro
          </DialogTitle>

          {showUsage && (
            <p className="text-sm font-medium text-text-2">
              {resourceLabel}: {limitDetails.current_usage} / {limitDetails.max_allowed}
            </p>
          )}

          <DialogDescription className="max-w-sm text-sm text-text-2">
            Unlock unlimited co-pilot, mock interviews, autopilot, resume insights, and
            priority support.
          </DialogDescription>

          <p className="text-sm text-text-3">$5/mo · cancel anytime</p>

          <div className="mt-3 flex w-full justify-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleDismiss}>
              Maybe later
            </Button>
            <Button type="button" size="sm" onClick={handleUpgrade} autoFocus>
              Upgrade
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradePlanModal;
