/**
 * PII scrubbing for Sentry events.
 * Masks email addresses from URLs, messages, and extra context.
 */

const EMAIL_PATTERN = /[\w\.\-]+@[\w\.\-]+\.\w+/g;
const MASKED_EMAIL = "***@***.***";
const MASKED_VALUE = "***REDACTED***";

/**
 * Scrub PII from a Sentry event before transmission.
 * @param {Object} event - Sentry event object
 * @returns {Object} Modified event
 */
export function scrubPii(event) {
  if (!event) return event;

  // Mask email in user context
  if (event.user?.email) {
    event.user.email = MASKED_EMAIL;
  }

  // Mask email in extra context
  if (event.extra?.email) {
    event.extra.email = MASKED_EMAIL;
  }
  if (event.extra?.company) {
    event.extra.company = MASKED_VALUE;
  }

  // Mask email patterns in request URL
  if (event.request?.url) {
    event.request.url = event.request.url.replace(EMAIL_PATTERN, MASKED_EMAIL);
  }

  // Mask email in message
  if (event.message && typeof event.message === "string") {
    event.message = event.message.replace(EMAIL_PATTERN, MASKED_EMAIL);
  }

  // Mask emails in breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs.forEach((crumb) => {
      if (crumb.message && typeof crumb.message === "string") {
        crumb.message = crumb.message.replace(EMAIL_PATTERN, MASKED_EMAIL);
      }
      if (crumb.data) {
        Object.keys(crumb.data).forEach((key) => {
          if (typeof crumb.data[key] === "string") {
            crumb.data[key] = crumb.data[key].replace(EMAIL_PATTERN, MASKED_EMAIL);
          }
        });
      }
    });
  }

  return event;
}
