/** Settings referral section — invite link, copy button, and referral stats. */

import { useState, useCallback } from "react";
import { toast } from "sonner";

import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import Copy from "lucide-react/dist/esm/icons/copy";

import { trackEvent } from "../lib/analytics";
import { COPY_RESET_MS } from "../lib/constants";
import SettingsPageShell, { SettingsFieldBlock } from "./SettingsPageShell";
import { Button } from "./ui/button";

function SettingsReferralSection({ user }) {
  const [copied, setCopied] = useState(false);

  const referralCode = user?.referral_code ?? null;
  const referralCount = user?.referral_count ?? 0;
  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : null;

  const handleCopy = useCallback(async () => {
    if (!referralLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      trackEvent("referral_link_copied", { referral_code: referralCode });
      toast.success("Referral link copied!");
      window.setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      toast.error("Failed to copy link.");
    }
  }, [referralLink, referralCode]);

  const friendLabel = referralCount === 1 ? "friend" : "friends";
  const earnedLabel = referralCount === 1 ? "month" : "months";

  return (
    <SettingsPageShell
      title="Refer a friend."
      subtitle="Get a free month of Pro for each friend who signs up."
    >
      {referralLink ? (
        <SettingsFieldBlock label="Your link">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={referralLink}
              aria-label="Referral link"
              className="flex-1 cursor-not-allowed rounded-md border border-border-1 bg-surface-1 px-3 py-2 font-sans text-sm text-text-2"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopy}
              aria-label="Copy referral link"
              className="flex shrink-0 items-center gap-1.5"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-brand-600" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </SettingsFieldBlock>
      ) : (
        <p className="text-sm text-text-2">No referral code available.</p>
      )}

      <p className="text-sm text-text-2">
        You&apos;ve referred{" "}
        <span className="font-medium text-text-1">{referralCount}</span> {friendLabel}
        {" · "}
        Earned{" "}
        <span className="font-medium text-text-1">{referralCount}</span> {earnedLabel} free
      </p>
    </SettingsPageShell>
  );
}

export default SettingsReferralSection;
