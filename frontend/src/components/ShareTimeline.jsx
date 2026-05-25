/** Settings section for generating and managing a public timeline share link. */

import { useState } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import Copy from "lucide-react/dist/esm/icons/copy";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import Link2Off from "lucide-react/dist/esm/icons/link-2-off";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { toast } from "sonner";

import { useCreateTimelineShare, useMyTimelineShare, useRevokeTimelineShare } from "../hooks/useSharing";
import { trackEvent } from "../lib/analytics";
import { COPY_RESET_MS } from "../lib/constants";
import { ICON_BUTTON, INPUT_READONLY } from "../lib/designTokens";
import { Button } from "./ui/button";

const BASE_URL = window.location.origin;

function buildTimelineUrl(slug) {
  return `${BASE_URL}/shared/timeline/${slug}`;
}

function formatExpiry(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days === 0 ? "Expires today" : `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

function ShareUrlField({ url, copyLabel }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), COPY_RESET_MS);
  };

  return (
    <div className="flex items-center gap-1 rounded-md border border-border-1 bg-surface-0 pr-1">
      <input
        type="text"
        readOnly
        value={url}
        aria-label="Timeline share link URL"
        className={`${INPUT_READONLY} min-w-0 flex-1 border-0 bg-transparent focus-visible:outline-none`}
      />
      <button
        type="button"
        onClick={handleCopy}
        className={ICON_BUTTON}
        aria-label={copied ? "Link copied" : copyLabel}
      >
        {copied ? (
          <Check className="h-4 w-4 text-status-success" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function ActiveShare({ share, onRevoke, isRevoking }) {
  const url = buildTimelineUrl(share.slug);

  return (
    <div className="flex flex-col gap-3">
      <ShareUrlField url={url} copyLabel="Copy timeline link" />
      <p className="text-xs text-text-3">{formatExpiry(share.expires_at)}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
      >
        Open public page
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRevoke}
        disabled={isRevoking}
        className="self-start gap-1.5 text-xs text-brand-700 hover:bg-brand-50 hover:text-brand-800"
      >
        {isRevoking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Link2Off className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Revoke link
      </Button>
    </div>
  );
}

function NoShare({ onCreate, isCreating }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-2">
        Anyone with the link can view a read-only timeline: stages, dates, and outcomes only.
      </p>
      <Button
        type="button"
        size="sm"
        onClick={onCreate}
        disabled={isCreating}
        className="flex items-center gap-1.5 self-start"
      >
        {isCreating ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden="true" />
        )}
        Generate link
      </Button>
    </div>
  );
}

function ShareTimeline() {
  const { data: share, isLoading } = useMyTimelineShare();
  const { mutate: createShare, isPending: isCreating } = useCreateTimelineShare();
  const { mutate: revokeShare, isPending: isRevoking } = useRevokeTimelineShare();

  const handleCreate = () => {
    createShare(undefined, {
      onSuccess: () => trackEvent("timeline_share_link_created"),
    });
  };

  return (
    <section
      aria-labelledby="timeline-share-heading"
      className="flex flex-col gap-3 rounded-xl border border-border-1 bg-surface-0 p-4"
    >
      <h2 id="timeline-share-heading" className="text-sm font-semibold text-text-1">
        Share your timeline
      </h2>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-text-3" aria-label="Loading" />
      ) : share ? (
        <ActiveShare share={share} onRevoke={revokeShare} isRevoking={isRevoking} />
      ) : (
        <NoShare onCreate={handleCreate} isCreating={isCreating} />
      )}
    </section>
  );
}

export default ShareTimeline;
