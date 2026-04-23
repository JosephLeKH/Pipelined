/** Offer comparison page: side-by-side table for all Offer-stage applications. */

import { useState, useCallback } from "react";
import confetti from "canvas-confetti";
import Trophy from "lucide-react/dist/esm/icons/trophy";

import NavBar from "../components/NavBar";
import { useApplications } from "../hooks/useApplications";
import { useUpdateApplication } from "../hooks/useApplications";
import { OFFER_FIELDS, OFFER_STAGE } from "../lib/constants";
import { INPUT_BASE, SPINNER_SM } from "../lib/designTokens";
import { formatUSD } from "../lib/currencyUtils";

const CONFETTI_CONFIG = { particleCount: 150, spread: 80, origin: { y: 0.5 } };

function fmtCell(fieldType, value) {
  if (value == null || value === "") return null;
  return fieldType === "currency" ? formatUSD(value) : String(value);
}

function EditableCellInput({ value, fieldType, handleBlur }) {
  return (
    <input
      type={fieldType === "currency" ? "number" : "text"}
      defaultValue={value ?? ""}
      autoFocus
      onBlur={handleBlur}
      className={`w-full ${INPUT_BASE}`}
      aria-label={`Edit ${fieldType}`}
    />
  );
}

function EditableCellDisplay({ value, fieldType, onEdit }) {
  const display = fmtCell(fieldType, value);
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full text-left text-sm text-gray-700 hover:underline dark:text-gray-300"
    >
      {display ?? <span className="italic text-gray-400">—</span>}
    </button>
  );
}

function EditableCell({ appId, fieldKey, fieldType, value, offerDetails, onSave }) {
  const [editing, setEditing] = useState(false);

  const handleBlur = useCallback(
    (e) => {
      const raw = e.target.value;
      let newVal = null;
      if (raw !== "") {
        newVal = fieldType === "currency" ? (isNaN(parseInt(raw, 10)) ? null : parseInt(raw, 10)) : raw;
      }
      onSave(appId, fieldKey, newVal, offerDetails);
      setEditing(false);
    },
    [appId, fieldKey, fieldType, offerDetails, onSave]
  );

  return editing
    ? <EditableCellInput value={value} fieldType={fieldType} handleBlur={handleBlur} />
    : <EditableCellDisplay value={value} fieldType={fieldType} onEdit={() => setEditing(true)} />;
}

function LoadingState() {
  return (
    <>
      <NavBar />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className={SPINNER_SM} />
      </div>
    </>
  );
}

function ErrorState() {
  return (
    <>
      <NavBar />
      <div className="flex min-h-[60vh] items-center justify-center text-rose-600">
        Failed to load offers.
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <>
      <NavBar />
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
        <Trophy className="mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-medium font-display text-gray-900 dark:text-gray-100">No offers yet</p>
        <p className="text-xs font-sans text-gray-500 dark:text-gray-400">
          Move an application to the Offer stage to compare packages here.
        </p>
      </div>
    </>
  );
}

function OfferComparisonHeader() {
  return (
    <h1 className="mb-6 font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
      Offer Comparison
    </h1>
  );
}

function OfferHeaderCell({ app, isWinner, onMarkWinner }) {
  return (
    <th className="min-w-[180px] px-4 py-3 text-left">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          {isWinner && <Trophy className="h-4 w-4 text-amber-500" aria-label="Winner" />}
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {app.company ?? "Unknown"}
          </span>
        </div>
        <span className="truncate text-xs text-gray-500 dark:text-gray-400">
          {app.role_title ?? ""}
        </span>
        <button
          type="button"
          onClick={() => onMarkWinner(app.id)}
          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            isWinner
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              : "bg-gray-100 text-gray-600 hover:bg-brand-100 hover:text-brand-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-brand-900/40 dark:hover:text-brand-300"
          }`}
        >
          <Trophy className="h-3 w-3" />
          {isWinner ? "Winner!" : "Mark winner"}
        </button>
      </div>
    </th>
  );
}

function OfferComparisonTable({ apps, winnerId, handleSave, handleMarkWinner }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Field
            </th>
            {apps.map((app) => (
              <OfferHeaderCell key={app.id} app={app} isWinner={winnerId === app.id} onMarkWinner={handleMarkWinner} />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
          {OFFER_FIELDS.map((field) => (
            <tr key={field.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {field.label}
              </td>
              {apps.map((app) => {
                const offerDetails = app.offer_details ?? {};
                return (
                  <td key={app.id} className="px-4 py-3">
                    <EditableCell
                      appId={app.id}
                      fieldKey={field.key}
                      fieldType={field.type}
                      value={offerDetails[field.key] ?? null}
                      offerDetails={offerDetails}
                      onSave={handleSave}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OfferComparison() {
  const { data, isLoading, error } = useApplications({ stage: OFFER_STAGE, limit: 100 });
  const { mutate: updateApp } = useUpdateApplication();
  const [winnerId, setWinnerId] = useState(null);

  const handleSave = useCallback(
    (appId, fieldKey, newVal, currentOfferDetails) => {
      updateApp({
        id: appId,
        body: { offer_details: { ...currentOfferDetails, [fieldKey]: newVal } },
      });
    },
    [updateApp]
  );

  const handleMarkWinner = useCallback((appId) => {
    setWinnerId(appId);
    confetti(CONFETTI_CONFIG);
  }, []);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState />;

  const apps = data?.data ?? [];
  if (apps.length === 0) return <EmptyState />;

  return (
    <>
      <NavBar />
      <main className="px-4 sm:px-6 py-8">
        <OfferComparisonHeader />
        <OfferComparisonTable apps={apps} winnerId={winnerId} handleSave={handleSave} handleMarkWinner={handleMarkWinner} />
      </main>
    </>
  );
}

export default OfferComparison;
