/** Manages adding and displaying contacts linked to an application. */

import { useState } from "react";

import Plus from "lucide-react/dist/esm/icons/plus";

import { useApplicationContacts } from "../hooks/useContacts";
import { Button } from "./ui/button";
import ContactCard from "./ContactCard";
import ContactForm from "./ContactForm";
import ContactLinkDropdown from "./ContactLinkDropdown";

const CONTACTS_ADD_MODE_NEW = "new";
const CONTACTS_ADD_MODE_LINK = "link";

function ContactsSection({ applicationId }) {
  const { data, isLoading, error, refetch } = useApplicationContacts(applicationId);
  const [addMode, setAddMode] = useState(null);

  const contacts = Array.isArray(data) ? data : (data?.data ?? []);
  const linkedIds = contacts.map((c) => c.id);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-muted-foreground">Contacts</span>
        {!addMode && (
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddMode(CONTACTS_ADD_MODE_LINK)}
              className="text-xs text-primary hover:bg-primary/10 hover:text-primary">
              Link
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddMode(CONTACTS_ADD_MODE_NEW)}
              aria-label="Add contact" className="text-xs text-primary hover:bg-primary/10 hover:text-primary gap-1">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New
            </Button>
          </div>
        )}
      </div>
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {error && (
        <div role="alert" className="flex items-center justify-between gap-2">
          <p className="text-xs text-destructive">Failed to load contacts.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            aria-label="Retry loading contacts"
          >
            Retry
          </Button>
        </div>
      )}
      {!isLoading && !error && contacts.length === 0 && !addMode && (
        <p className="text-xs text-muted-foreground">No contacts yet.</p>
      )}
      {contacts.map((contact) => (
        <ContactCard key={contact.id} contact={contact} applicationId={applicationId} />
      ))}
      {addMode === CONTACTS_ADD_MODE_NEW && (
        <ContactForm applicationId={applicationId} onDone={() => setAddMode(null)} />
      )}
      {addMode === CONTACTS_ADD_MODE_LINK && (
        <ContactLinkDropdown
          applicationId={applicationId}
          linkedIds={linkedIds}
          onDone={() => setAddMode(null)}
        />
      )}
    </div>
  );
}

export default ContactsSection;
