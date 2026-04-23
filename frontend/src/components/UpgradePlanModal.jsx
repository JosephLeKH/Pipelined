/** Modal shown when an API call returns TIER_LIMIT_EXCEEDED (403).
 *  Listens for the pipelined:tier_limit_exceeded custom event dispatched by client.js.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Zap from "lucide-react/dist/esm/icons/zap";
import X from "lucide-react/dist/esm/icons/x";

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

  if (!visible) return null;

  const resourceLabel = limitDetails?.limit_name
    ? (RESOURCE_LABELS[limitDetails.limit_name] ?? limitDetails.limit_name)
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleDismiss}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500">
            <Zap className="h-7 w-7 text-white" />
          </div>

          <h2
            id="upgrade-modal-title"
            className="mb-2 text-xl font-bold text-gray-900 dark:text-white"
          >
            You&apos;ve reached a free plan limit
          </h2>

          {resourceLabel && limitDetails?.current_usage != null && limitDetails?.max_allowed != null && (
            <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
              {resourceLabel}: {limitDetails.current_usage} / {limitDetails.max_allowed}
            </p>
          )}

          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Upgrade to Pro for unlimited access to all features.
          </p>

          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={handleUpgrade}
              className="w-full rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors"
            >
              Upgrade to Pro
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
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
