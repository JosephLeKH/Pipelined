/** Side-by-side offer card for /offers comparison grid (PRD-07 §4). */

import { EditableCell } from "./OfferEditableCell";
import { formatUSD } from "../lib/currencyUtils";
import { computeTotalY1, OFFER_COMPARE_FIELDS } from "../lib/offerUtils";

function OfferCompareRow({ field, app, offerDetails, onSave, isTotalRow = false }) {
  if (isTotalRow) {
    const total = computeTotalY1(offerDetails);
    return (
      <div className="flex items-baseline justify-between gap-3 border-t border-border-1 pt-3">
        <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-text-3">
          Total Y1
        </span>
        <span className="text-base font-semibold text-text-1">
          {total > 0 ? formatUSD(total) : "N/A"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-text-3">
        {field.label}
      </span>
      <div className="min-w-0 text-right text-sm font-medium text-text-1">
        <EditableCell
          appId={app.id}
          fieldKey={field.key}
          fieldType={field.type}
          value={offerDetails[field.key] ?? null}
          offerDetails={offerDetails}
          onSave={onSave}
        />
      </div>
    </div>
  );
}

export function OfferComparisonCard({ app, isBest, onSave }) {
  const offerDetails = app.offer_details ?? {};

  return (
    <article
      className={`relative flex flex-col gap-4 rounded-xl bg-surface-0 p-6 ${
        isBest ? "border-2 border-brand-700" : "border border-border-1"
      }`}
      aria-label={`${app.company ?? "Unknown"} offer${isBest ? ", best total Y1" : ""}`}
    >
      {isBest && (
        <span className="absolute right-4 top-4 rounded-md bg-brand-700 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-white">
          Best
        </span>
      )}
      <header className="pr-16">
        <h2 className="truncate text-base font-semibold text-text-1">{app.company ?? "Unknown"}</h2>
        {app.role_title && (
          <p className="mt-0.5 truncate text-xs text-text-3">{app.role_title}</p>
        )}
      </header>
      <div className="flex flex-col gap-3">
        {OFFER_COMPARE_FIELDS.map((field) => (
          <OfferCompareRow
            key={field.key}
            field={field}
            app={app}
            offerDetails={offerDetails}
            onSave={onSave}
          />
        ))}
        <OfferCompareRow app={app} offerDetails={offerDetails} onSave={onSave} isTotalRow />
      </div>
    </article>
  );
}
