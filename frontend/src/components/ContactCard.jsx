/** Compact card for a single contact in the detail panel. */

import { formatDistanceToNow } from "date-fns";

import PhoneCall from "lucide-react/dist/esm/icons/phone-call";
import Unlink from "lucide-react/dist/esm/icons/unlink";

import { usePingContact, useUnlinkContact } from "../hooks/useContacts";
import { BADGE_BASE } from "../lib/designTokens";
import { RELATIONSHIP_COLORS } from "../lib/constants";
import { isStaleContact } from "../lib/dateUtils";

function RelationshipBadge({ relationship }) {
  const colors = RELATIONSHIP_COLORS[relationship] ?? { bg: "bg-gray-100", text: "text-gray-700" };
  const label = relationship.replace("_", " ");
  return (
    <span className={`capitalize ${BADGE_BASE} ${colors.bg} ${colors.text}`}>
      {label}
    </span>
  );
}

function ContactCard({ contact, applicationId }) {
  const { mutate: ping, isPending: pinging } = usePingContact();
  const { mutate: unlink, isPending: unlinking } = useUnlinkContact();

  const stale = isStaleContact(contact.last_contacted_at);
  const lastContactedLabel = contact.last_contacted_at
    ? formatDistanceToNow(new Date(contact.last_contacted_at), { addSuffix: true })
    : "Never contacted";

  return (
    <div className="flex flex-col gap-1.5 rounded-card border border-slate-100 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            {stale && (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400"
                title="Stale — no contact in 14+ days"
              />
            )}
            <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {contact.name}
            </span>
          </div>
          {(contact.role || contact.company) && (
            <span className="truncate text-xs text-slate-500 dark:text-slate-400">
              {[contact.role, contact.company].filter(Boolean).join(" · ")}
            </span>
          )}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <RelationshipBadge relationship={contact.relationship} />
            <span className="text-xs text-slate-400 dark:text-slate-500">{lastContactedLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={pinging}
            onClick={() => ping({ contactId: contact.id })}
            className="rounded p-1 text-gray-400 hover:bg-green-50 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50 dark:hover:bg-green-900/30"
            aria-label="Mark as pinged"
            title="Mark as pinged"
          >
            <PhoneCall className="h-3.5 w-3.5" />
          </button>
          {applicationId && (
            <button
              type="button"
              disabled={unlinking}
              onClick={() => unlink({ contactId: contact.id, applicationId })}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50 dark:hover:bg-red-900/30"
              aria-label="Unlink contact"
              title="Unlink from application"
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactCard;
