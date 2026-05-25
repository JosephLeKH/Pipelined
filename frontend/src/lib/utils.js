import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { BANNER_DISMISS_TTL_MS } from "./constants";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Returns true when a banner was dismissed within the 7-day TTL (PRD-10). */
export function isBannerDismissed(storageKey) {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return false;
  if (raw === "true") return true;

  try {
    const { dismissedAt } = JSON.parse(raw);
    if (!dismissedAt) return false;
    return Date.now() - new Date(dismissedAt).getTime() < BANNER_DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

/** Persists banner dismissal with timestamp for 7-day reappear policy. */
export function dismissBanner(storageKey) {
  localStorage.setItem(storageKey, JSON.stringify({ dismissedAt: new Date().toISOString() }));
}
