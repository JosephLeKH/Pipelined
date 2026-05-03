/** Settings section for generating and managing a public timeline share link. */

import { useState } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import Copy from "lucide-react/dist/esm/icons/copy";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import Link2Off from "lucide-react/dist/esm/icons/link-2-off";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { useCreateTimelineShare, useMyTimelineShare, useRevokeTimelineShare } from "../hooks/useSharing";
import { trackEvent } from "../lib/analytics";
import { COPY_RESET_MS } from "../lib/constants";
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

function CopyButton({ url }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_RESET_MS);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="text-xs text-primary hover:bg-primary/10 gap-1.5"
      aria-label={copied ? "Link copied" : "Copy timeline link"}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? "Copied!" : "Copy link"}
    </Button>
  );
}

function ActiveShare({ share, onRevoke, isRevoking }) {
  const url = buildTimelineUrl(share.slug);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="truncate text-xs font-medium text-primary">{url}</span>
          <span className="text-xs text-muted-foreground">{formatExpiry(share.expires_at)}</span>
        </div>
        <CopyButton url={url} />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRevoke}
        disabled={isRevoking}
        className="self-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
      >
        {isRevoking
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          : <Link2Off className="h-3.5 w-3.5" aria-hidden="true" />}
        Revoke link
      </Button>
    </div>
  );
}

function NoShare({ onCreate, isCreating }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Generate a read-only public link to your application timeline. Stages, dates, and outcomes — no sensitive details.
      </p>
      <Button
        type="button"
        onClick={onCreate}
        disabled={isCreating}
        className="flex items-center gap-1.5 self-start"
      >
        {isCreating
          ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          : <Link2 className="h-4 w-4" aria-hidden="true" />}
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
    <section aria-labelledby="timeline-share-heading" className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <h2 id="timeline-share-heading" className="font-display text-sm font-semibold text-foreground">
        Share Your Timeline
      </h2>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
      ) : share ? (
        <ActiveShare share={share} onRevoke={revokeShare} isRevoking={isRevoking} />
      ) : (
        <NoShare onCreate={handleCreate} isCreating={isCreating} />
      )}
    </section>
  );
}

export default ShareTimeline;
