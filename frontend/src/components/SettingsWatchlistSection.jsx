/** Settings watchlist section — add/remove company career pages (max 25). */

import { useState } from "react";

import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import {
  WATCHLIST_CAREERS_URL_MAX_LENGTH,
  WATCHLIST_COMPANIES_MAX,
  WATCHLIST_COMPANY_NAME_MAX_LENGTH,
} from "../lib/constants";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CARD_BASE } from "../lib/designTokens";

const WATCHLIST_EXPLAINER =
  "We scan your watchlist career pages nightly and surface new roles that match your profile.";

function SettingsWatchlistSection() {
  const { user } = useAuth();
  const { mutateAsync, isPending } = useUpdateUser();
  const [companies, setCompanies] = useState(
    () => user?.watchlist_companies ?? [],
  );
  const [name, setName] = useState("");
  const [careersUrl, setCareersUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const atLimit = companies.length >= WATCHLIST_COMPANIES_MAX;

  const handleAdd = () => {
    const trimmedName = name.trim();
    const trimmedUrl = careersUrl.trim();
    if (!trimmedName || !trimmedUrl) {
      setError("Company name and careers URL are required.");
      return;
    }
    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      setError("Careers URL must start with http:// or https://.");
      return;
    }
    if (atLimit) {
      setError(`You can watch up to ${WATCHLIST_COMPANIES_MAX} companies.`);
      return;
    }
    setCompanies((prev) => [...prev, { name: trimmedName, careers_url: trimmedUrl }]);
    setName("");
    setCareersUrl("");
    setError(null);
    setSaved(false);
  };

  const handleRemove = (index) => {
    setCompanies((prev) => prev.filter((_, idx) => idx !== index));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaved(false);
    setError(null);
    try {
      await mutateAsync({ watchlist_companies: companies });
      setSaved(true);
    } catch {
      setError("Failed to save watchlist.");
    }
  };

  return (
    <div className={`${CARD_BASE} p-6`}>
      <h2 className="font-display mb-1 text-lg font-semibold text-foreground">Company watchlist</h2>
      <p className="mb-5 text-sm text-muted-foreground">{WATCHLIST_EXPLAINER}</p>

      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      {saved && !error && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-brand-200 bg-brand-50 px-3 py-3 text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
        >
          Watchlist saved.
        </p>
      )}

      {companies.length > 0 && (
        <ul className="mb-5 divide-y divide-border rounded-lg border border-border">
          {companies.map((company, index) => (
            <li
              key={`${company.name}-${company.careers_url}`}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{company.name}</p>
                <p className="truncate text-xs text-muted-foreground">{company.careers_url}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={isPending}
                aria-label={`Remove ${company.name}`}
                className={`${BUTTON_SECONDARY} inline-flex shrink-0 items-center gap-1 px-2 py-1 text-xs`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {companies.length} of {WATCHLIST_COMPANIES_MAX} companies
        </p>
        <div>
          <label htmlFor="watchlist-name" className="text-sm font-medium text-foreground">
            Company name
          </label>
          <input
            id="watchlist-name"
            type="text"
            value={name}
            maxLength={WATCHLIST_COMPANY_NAME_MAX_LENGTH}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending || atLimit}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label htmlFor="watchlist-url" className="text-sm font-medium text-foreground">
            Careers page URL
          </label>
          <input
            id="watchlist-url"
            type="url"
            value={careersUrl}
            maxLength={WATCHLIST_CAREERS_URL_MAX_LENGTH}
            onChange={(e) => setCareersUrl(e.target.value)}
            disabled={isPending || atLimit}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="https://boards.greenhouse.io/acme"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || atLimit}
          className={`${BUTTON_SECONDARY} inline-flex items-center gap-1.5`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add company
        </button>
      </div>

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={handleSave} disabled={isPending} className={BUTTON_PRIMARY}>
          Save
        </button>
      </div>
    </div>
  );
}

export default SettingsWatchlistSection;
