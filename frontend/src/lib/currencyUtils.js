/** Shared currency formatting utilities. */

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * Formats a numeric amount as a USD currency string.
 * @param {number} amount
 * @returns {string}
 */
export function formatUSD(amount) {
  return USD_FORMATTER.format(amount);
}
