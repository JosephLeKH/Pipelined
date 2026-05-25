/** SVG data-URI placeholder for marketing screenshots until PRD-04 assets ship. */

export function screenshotPlaceholderDataUri(width, height, label) {
  const safeLabel = label.replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#FAFAFA"/>
    <rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="2"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8E8F94" font-family="Inter,system-ui,sans-serif" font-size="16">${safeLabel}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
