/** Dropdown to search and link an existing contact to an application. */

import { useState } from "react";

import Search from "lucide-react/dist/esm/icons/search";

import { useContacts, useLinkContact } from "../hooks/useContacts";
import { Button } from "./ui/button";

const MIN_SEARCH_LEN = 1;

function ContactLinkDropdown({ applicationId, linkedIds = [], onDone }) {
  const [query, setQuery] = useState("");
  const { data, isLoading, error, refetch } = useContacts({});
  const { mutate: linkContact, isPending } = useLinkContact();

  const allContacts = Array.isArray(data) ? data : (data?.data ?? []);

  const filtered = allContacts.filter((c) => {
    if (linkedIds.includes(c.id)) return false;
    if (query.length < MIN_SEARCH_LEN) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q) ||
      (c.role ?? "").toLowerCase().includes(q)
    );
  });

  function handleLink(contactId) {
    linkContact(
      { contactId, applicationId },
      { onSuccess: () => onDone?.() }
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-border px-3 py-2.5">
      <div className="flex items-center gap-1.5 rounded border border-border px-2 py-1">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          aria-label="Search contacts to link"
        />
      </div>
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {error && (
        <div role="alert" className="flex items-center justify-between gap-2">
          <p className="text-xs text-destructive">Failed to load contacts.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} aria-label="Retry loading contacts">
            Retry
          </Button>
        </div>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground">No contacts found.</p>
      )}
      <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
        {filtered.map((contact) => (
          <li key={contact.id}>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleLink(contact.id)}
              className="h-auto w-full justify-between px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="truncate font-medium text-foreground">{contact.name}</span>
                {(contact.role || contact.company) && (
                  <span className="truncate text-xs text-muted-foreground">
                    {[contact.role, contact.company].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
              <span className="ml-2 shrink-0 text-xs text-primary">Link</span>
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="link"
        onClick={() => onDone?.()}
        className="self-end h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </Button>
    </div>
  );
}

export default ContactLinkDropdown;
