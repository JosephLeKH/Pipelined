/** Company logo via DuckDuckGo icon API with letter-circle fallback. */

import { useState } from "react";
import { companyLogoUrl } from "../lib/constants";

function CompanyLogo({ company_domain, company, size = 16 }) {
  const [hasError, setHasError] = useState(false);
  const initial = (company || "?")[0].toUpperCase();

  if (!company_domain || hasError) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
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
      src={companyLogoUrl(company_domain)}
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
