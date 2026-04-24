/** Modal shown when an API call returns TIER_LIMIT_EXCEEDED (403).
 *  Listens for the pipelined:tier_limit_exceeded custom event dispatched by client.js.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Zap from "lucide-react/dist/esm/icons/zap";
import X from "lucide-react/dist/esm/icons/x";

import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_GHOST, MODAL_BACKDROP, MODAL_CARD } from "../lib/designTokens";

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

  useEffect(() => {
    if (!visible) return;
    function onKeyDown(e) { if (e.key === "Escape") setVisible(false); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible]);

  const handleUpgrade = useCallback(() => {
    setVisible(false);
    navigate("/pricing");
  }, [navigate]);

  if (!visible) return null;

  const resourceLabel = limitDetails?.limit_name
    ? (RESOURCE_LABELS[limitDetails.limit_name] ?? limitDetails.limit_name)
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className={`${MODAL_BACKDROP} cursor-pointer`}
      onClick={handleDismiss}
    >
      <div
        className={`${MODAL_CARD} max-w-md p-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className={`${BUTTON_GHOST} absolute right-4 top-4 p-2`}
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>

        <div className="flex flex-col items-center text-center">
          <Zap className="mb-4 h-8 w-8 text-brand-500" />

          <h2
            id="upgrade-modal-title"
            className="mb-2 font-display text-lg font-semibold text-gray-900 dark:text-white"
          >
            You&apos;ve reached a free plan limit
          </h2>

          {resourceLabel && limitDetails?.current_usage != null && limitDetails?.max_allowed != null && (
            <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
              {resourceLabel}: {limitDetails.current_usage} / {limitDetails.max_allowed}
            </p>
          )}

          <p className="mb-6 font-sans text-sm text-gray-700 dark:text-gray-400">
            Upgrade to Pro for unlimited access to all features.
          </p>

          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={handleUpgrade}
              autoFocus
              className={`${BUTTON_PRIMARY} w-full px-6 py-3`}
            >
              Upgrade to Pro
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className={`${BUTTON_SECONDARY} w-full px-6 py-3`}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradePlanModal;
