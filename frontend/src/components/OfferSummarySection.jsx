/** AI offer summary with link to compare multiple offers. */

import { Link } from "react-router-dom";
import Gift from "lucide-react/dist/esm/icons/gift";

import { useApplications } from "../hooks/useApplications";
import { formatUSD } from "../lib/currencyUtils";
import AiSection from "./AiSection";

const MIN_OFFERS_TO_COMPARE = 2;

function formatCompLine(offerDetails) {
  const parts = [];
  if (offerDetails.base_salary != null) {
    parts.push(`${formatUSD(offerDetails.base_salary)} base`);
  }
  if (offerDetails.signing_bonus != null) {
    parts.push(`${formatUSD(offerDetails.signing_bonus)} signing`);
  }
  if (offerDetails.equity) {
    parts.push(offerDetails.equity);
  }
  if (offerDetails.total_comp != null) {
    parts.push(`${formatUSD(offerDetails.total_comp)} total comp`);
  }
  return parts.join(" · ");
}

function OfferSummarySection({ application }) {
  const offerDetails = application.offer_details ?? {};
  const { data: offerApps = [] } = useApplications({ stage: "Offer", limit: 100 });

  if (application.current_stage !== "Offer") {
    return null;
  }

  const compLine = formatCompLine(offerDetails);
  const hasMultipleOffers = offerApps.length >= MIN_OFFERS_TO_COMPARE;

  if (!compLine && !hasMultipleOffers) {
    return null;
  }

  return (
    <AiSection title="Offer summary" icon={Gift} id="offer-summary">
      {compLine ? (
        <p className="text-sm text-foreground" data-testid="offer-summary-comp">
          {compLine}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Offer details will appear here once extracted from email or entered manually.
        </p>
      )}
      {hasMultipleOffers ? (
        <Link
          to="/offers"
          className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          data-testid="offer-compare-link"
        >
          Compare {offerApps.length} offers →
        </Link>
      ) : null}
    </AiSection>
  );
}

export default OfferSummarySection;
