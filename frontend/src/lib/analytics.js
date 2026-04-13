/**
 * Analytics module wrapping PostHog.
 * All functions are no-ops when VITE_POSTHOG_KEY is not set (safe for dev/test).
 */

import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://app.posthog.com";

/** Initialize PostHog analytics. Call once on app mount. */
export function initAnalytics() {
  if (!POSTHOG_KEY) return;
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      autocapture: false,
    });
  } catch (_err) {
    // Analytics failure must never break the app
  }
}

/** Track a named event with optional properties. */
export function trackEvent(eventName, properties = {}) {
  if (!POSTHOG_KEY) return;
  try {
    posthog.capture(eventName, properties);
  } catch (_err) {}
}

/** Identify the current user with traits. */
export function identifyUser(userId, traits = {}) {
  if (!POSTHOG_KEY) return;
  try {
    posthog.identify(userId, traits);
  } catch (_err) {}
}

/** Reset the current user identity on logout. */
export function resetUser() {
  if (!POSTHOG_KEY) return;
  try {
    posthog.reset();
  } catch (_err) {}
}
