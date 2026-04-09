/** Company logo via Clearbit favicon API with letter-circle fallback. */

import { useState } from "react";
import { CLEARBIT_LOGO_BASE_URL, COMPANY_LOGO_FALLBACK_COLORS } from "../lib/constants";

function getFallbackColor(company) {
  let hash = 0;
  const s = company || "";
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) & 0x7fffffff;
  }
  return COMPANY_LOGO_FALLBACK_COLORS[hash % COMPANY_LOGO_FALLBACK_COLORS.length];
}

function CompanyLogo({ company_domain, company, size = 32 }) {
  const [hasError, setHasError] = useState(false);
  const initial = (company || "?")[0].toUpperCase();
  const colorClass = getFallbackColor(company);

  if (!company_domain || hasError) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full text-white ${colorClass}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
        aria-hidden="true"
        data-testid="company-logo-fallback"
      >
        {initial}
      </span>
    );
  }

  return (
    <img
      src={`${CLEARBIT_LOGO_BASE_URL}/${company_domain}`}
      alt={company}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setHasError(true)}
      className="shrink-0 rounded"
      data-testid="company-logo-img"
    />
  );
}

export default CompanyLogo;
