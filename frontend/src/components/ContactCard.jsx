/** Compact card for a single contact in the detail panel. */

import { formatDistanceToNow } from "date-fns";

import PhoneCall from "lucide-react/dist/esm/icons/phone-call";
import Unlink from "lucide-react/dist/esm/icons/unlink";

import { usePingContact, useUnlinkContact } from "../hooks/useContacts";
import { RELATIONSHIP_COLORS } from "../lib/constants";
import { isStaleContact } from "../lib/dateUtils";
import { Button } from "./ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

function RelationshipBadge({ relationship }) {
  const colors = RELATIONSHIP_COLORS[relationship] ?? { bg: "bg-muted", text: "text-muted-foreground" };
  const label = relationship.replace("_", " ");
  return (
    <span className={`capitalize rounded-full text-xs font-medium px-2.5 py-1 inline-flex items-center gap-1 ${colors.bg} ${colors.text}`}>
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
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            {stale && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full bg-warning/80"
                    aria-label="Stale contact: no activity in 14+ days"
                    role="img"
                  />
                </TooltipTrigger>
                <TooltipContent>Stale: no contact in 14+ days</TooltipContent>
              </Tooltip>
            )}
            <span className="truncate text-sm font-medium text-foreground">
              {contact.name}
            </span>
          </div>
          {(contact.role || contact.company) && (
            <span className="truncate text-xs text-muted-foreground">
              {[contact.role, contact.company].filter(Boolean).join(" · ")}
            </span>
          )}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <RelationshipBadge relationship={contact.relationship} />
            <span className="text-xs text-muted-foreground">{lastContactedLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={pinging}
                onClick={() => ping({ contactId: contact.id })}
                className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                aria-label="Mark as pinged"
              >
                <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mark as pinged</TooltipContent>
          </Tooltip>
          {applicationId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={unlinking}
                  onClick={() => unlink({ contactId: contact.id, applicationId })}
                  className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Unlink contact"
                >
                  <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Unlink from application</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactCard;
