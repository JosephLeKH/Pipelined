/** Settings referral section — invite link, copy button, referral count, and super-referrer badge. */

import { useState, useCallback } from "react";
import { toast } from "sonner";

import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import Copy from "lucide-react/dist/esm/icons/copy";
import Gift from "lucide-react/dist/esm/icons/gift";
import Star from "lucide-react/dist/esm/icons/star";

import { trackEvent } from "../lib/analytics";
import { COPY_RESET_MS } from "../lib/constants";
import { CARD_BASE, BUTTON_SECONDARY, INPUT_READONLY } from "../lib/designTokens";

const SUPER_REFERRER_THRESHOLD = 3;

function SettingsReferralSection({ user }) {
  const [copied, setCopied] = useState(false);

  const referralCode = user?.referral_code ?? null;
  const referralCount = user?.referral_count ?? 0;
  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : null;
  const isSuperReferrer = referralCount >= SUPER_REFERRER_THRESHOLD;

  const handleCopy = useCallback(async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      trackEvent("referral_link_copied", { referral_code: referralCode });
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      toast.error("Failed to copy link.");
    }
  }, [referralLink, referralCode]);

  return (
    <div className={`${CARD_BASE} p-6`}>
      <div className="mb-4 flex items-center gap-2">
        <Gift className="h-5 w-5 text-brand-500" aria-hidden="true" />
        <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-gray-100">Invite Friends</h2>
        {isSuperReferrer && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <Star className="h-3 w-3" aria-hidden="true" />
            Super Referrer
          </span>
        )}
      </div>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Share your referral link. Every friend who signs up is counted toward your referral total.
      </p>

      {referralLink ? (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={referralLink}
            aria-label="Referral link"
            className={`flex-1 ${INPUT_READONLY}`}
          />
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy referral link"
            className={`flex items-center gap-1.5 ${BUTTON_SECONDARY}`}
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500">No referral code available.</p>
      )}

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <span className="font-semibold text-gray-900 dark:text-gray-100">{referralCount}</span>{" "}
        {referralCount === 1 ? "friend" : "friends"} joined using your link
        {isSuperReferrer && (
          <span className="ml-1 text-amber-600 dark:text-amber-400">— You're a Super Referrer!</span>
        )}
      </p>
    </div>
  );
}

export default SettingsReferralSection;
