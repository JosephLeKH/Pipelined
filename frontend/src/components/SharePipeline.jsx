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
import { BUTTON_PRIMARY } from "../lib/designTokens";

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
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:hover:bg-brand-900/30"
      aria-label={copied ? "Link copied" : "Copy share link"}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

function ActiveShare({ share, onRevoke, isRevoking }) {
  const url = buildShareUrl(share.slug);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="truncate text-xs font-medium text-green-800 dark:text-green-300">{url}</span>
          <span className="text-xs text-green-600 dark:text-green-400">{formatExpiry(share.expires_at)}</span>
        </div>
        <CopyButton url={url} />
      </div>
      <button
        type="button"
        onClick={onRevoke}
        disabled={isRevoking}
        className="flex items-center gap-1.5 self-start rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 dark:hover:bg-red-900/30"
      >
        {isRevoking
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Link2Off className="h-3.5 w-3.5" />}
        Revoke link
      </button>
    </div>
  );
}

function NoShare({ onCreate, isCreating }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Generate a read-only public link to your pipeline. Anyone with the link can view your applications.
      </p>
      <button
        type="button"
        onClick={onCreate}
        disabled={isCreating}
        className={`flex items-center gap-1.5 self-start ${BUTTON_PRIMARY}`}
      >
        {isCreating
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Link2 className="h-4 w-4" />}
        Generate link
      </button>
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
    <section aria-labelledby="share-heading" className="flex flex-col gap-3 rounded-card border border-gray-200 p-4 dark:border-gray-700">
      <h2 id="share-heading" className="text-sm font-semibold font-display text-gray-800 dark:text-gray-100">
        Share Your Pipeline
      </h2>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" aria-label="Loading" />
      ) : share ? (
        <ActiveShare share={share} onRevoke={revokeShare} isRevoking={isRevoking} />
      ) : (
        <NoShare onCreate={handleCreateShare} isCreating={isCreating} />
      )}
    </section>
  );
}

export default SharePipeline;
