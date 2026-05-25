/** Settings section for generating and managing a public pipeline share link. */

import { useState } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import Copy from "lucide-react/dist/esm/icons/copy";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import Link2Off from "lucide-react/dist/esm/icons/link-2-off";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { useCreateShare, useMyShare, useRevokeShare } from "../hooks/useSharing";
import { trackEvent } from "../lib/analytics";
import { COPY_RESET_MS } from "../lib/constants";
import { Button } from "./ui/button";

const BASE_URL = window.location.origin;

function buildShareUrl(slug) {
  return `${BASE_URL}/pipeline/${slug}`;
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
      className="gap-1.5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
      aria-label={copied ? "Link copied" : "Copy share link"}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? "Copied!" : "Copy link"}
    </Button>
  );
}

function ActiveShare({ share, onRevoke, isRevoking }) {
  const url = buildShareUrl(share.slug);
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
        className="self-start gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
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
        Generate a read-only public link to your pipeline. Anyone with the link can view your applications.
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

function SharePipeline() {
  const { data: share, isLoading } = useMyShare();
  const { mutate: createShare, isPending: isCreating } = useCreateShare();
  const { mutate: revokeShare, isPending: isRevoking } = useRevokeShare();

  const handleCreateShare = () => {
    createShare(undefined, {
      onSuccess: () => trackEvent("share_link_created"),
    });
  };

  return (
    <section aria-labelledby="share-heading" className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <h2 id="share-heading" className="text-sm font-semibold text-foreground">
        Share Your Pipeline
      </h2>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
      ) : share ? (
        <ActiveShare share={share} onRevoke={revokeShare} isRevoking={isRevoking} />
      ) : (
        <NoShare onCreate={handleCreateShare} isCreating={isCreating} />
      )}
    </section>
  );
}

export default SharePipeline;
