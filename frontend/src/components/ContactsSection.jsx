/** Manages adding and displaying contacts linked to an application. */

import { useState } from "react";

import Plus from "lucide-react/dist/esm/icons/plus";

import { useApplicationContacts } from "../hooks/useContacts";
import ContactCard from "./ContactCard";
import ContactForm from "./ContactForm";
import ContactLinkDropdown from "./ContactLinkDropdown";

const CONTACTS_ADD_MODE_NEW = "new";
const CONTACTS_ADD_MODE_LINK = "link";

function ContactsSection({ applicationId }) {
  const { data, isLoading } = useApplicationContacts(applicationId);
  const [addMode, setAddMode] = useState(null);

  const contacts = Array.isArray(data) ? data : (data?.data ?? []);
  const linkedIds = contacts.map((c) => c.id);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">Contacts</span>
        {!addMode && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAddMode(CONTACTS_ADD_MODE_LINK)}
              className="rounded px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2 dark:hover:bg-brand-900/30"
            >
              Link
            </button>
            <button
              type="button"
              onClick={() => setAddMode(CONTACTS_ADD_MODE_NEW)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2 dark:hover:bg-brand-900/30"
              aria-label="Add contact"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>
        )}
      </div>
      {isLoading && <p className="text-xs text-gray-400">Loading…</p>}
      {!isLoading && contacts.length === 0 && !addMode && (
        <p className="text-xs text-gray-400">No contacts yet.</p>
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
