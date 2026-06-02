/** Dismissable quick-tour banner shown at the top of /today for first-time visitors. */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import XIcon from "lucide-react/dist/esm/icons/x";

import { OPEN_COMMAND_PALETTE_EVENT, QUICK_TOUR_DISMISSED_KEY } from "../lib/constants";

const TOUR_ITEMS = [
  {
    label: "Open the Anthropic offer",
    description: "See how compensation tracking works",
    to: "/dashboard?stage=Offer",
  },
  {
    label: "Try the command palette",
    description: "Search apps, jump to pages, ask Scout",
    action: "palette",
  },
  {
    label: "Drag a Dashboard card",
    description: "Move it between stages on the Kanban view",
    to: "/dashboard?view=kanban",
  },
  {
    label: "Check the Tags page",
    description: "Filter applications by company type",
    to: "/tags",
  },
];

function readDismissed() {
  try {
    return localStorage.getItem(QUICK_TOUR_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function TourItem({ item, onActivate }) {
  const baseClass =
    "flex items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors " +
    "hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 " +
    "focus-visible:outline-brand-600 dark:focus-visible:outline-1";
  const content = (
    <>
      <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-text-1">{item.label}</span>
        <span className="block text-xs text-text-3">{item.description}</span>
      </span>
    </>
  );
  if (item.to) {
    return (
      <Link to={item.to} className={baseClass} onClick={onActivate}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={baseClass} onClick={onActivate}>
      {content}
    </button>
  );
}

export default function QuickTourBanner() {
  const [dismissed, setDismissed] = useState(true);

  // Read once on mount so SSR / initial paint never flashes the banner for
  // users who have already dismissed it.
  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(QUICK_TOUR_DISMISSED_KEY, "true");
    } catch {
      // localStorage may be unavailable in private browsing — banner just won't persist.
    }
    setDismissed(true);
  };

  const handleItemActivate = (item) => () => {
    if (item.action === "palette") {
      window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
    }
  };

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Quick tour"
      className="rounded-lg border border-border-1 bg-surface-1 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-text-1">Welcome! Try these in 30 seconds</h2>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss quick tour"
          className="rounded-md p-1 text-text-3 hover:bg-surface-2 hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:focus-visible:outline-1"
        >
          <XIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {TOUR_ITEMS.map((item) => (
          <li key={item.label}>
            <TourItem item={item} onActivate={handleItemActivate(item)} />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-text-3">
        Sample data was added automatically. Yours to edit or delete anytime.
      </p>
    </div>
  );
}
