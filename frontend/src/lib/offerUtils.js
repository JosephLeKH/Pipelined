/** Offer comparison helpers for Total Y1 and best-offer detection. */

export function computeTotalY1(offerDetails = {}) {
  const base = Number(offerDetails.base_salary) || 0;
  const equity = Number(offerDetails.equity_annual_value) || 0;
  const signing = Number(offerDetails.signing_bonus) || 0;
  return base + equity + signing;
}

export function findBestOfferId(apps) {
  if (!apps?.length) return null;

  let bestId = null;
  let bestTotal = -1;

  for (const app of apps) {
    const total = computeTotalY1(app.offer_details);
    if (total > bestTotal) {
      bestTotal = total;
      bestId = app.id;
    }
  }

  return bestTotal > 0 ? bestId : null;
}

export const OFFER_COMPARE_FIELDS = [
  { key: "base_salary", label: "Base salary", type: "currency" },
  { key: "equity_annual_value", label: "Equity / yr", type: "currency" },
  { key: "signing_bonus", label: "Sign-on", type: "currency" },
];
