/** Company logo via Clearbit favicon API with letter-circle fallback. */

import { useState } from "react";
import { CLEARBIT_LOGO_BASE_URL } from "../lib/constants";

function CompanyLogo({ company_domain, company, size = 32 }) {
  const [hasError, setHasError] = useState(false);
  const initial = (company || "?")[0].toUpperCase();

  if (!company_domain || hasError) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-medium"
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
