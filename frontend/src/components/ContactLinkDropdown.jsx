/** Dropdown to search and link an existing contact to an application. */

import { useState } from "react";

import Search from "lucide-react/dist/esm/icons/search";

import { useContacts, useLinkContact } from "../hooks/useContacts";

const MIN_SEARCH_LEN = 1;

function ContactLinkDropdown({ applicationId, linkedIds = [], onDone }) {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useContacts({});
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
    <div className="flex flex-col gap-2 rounded border border-gray-200 px-3 py-2.5 dark:border-gray-700">
      <div className="flex items-center gap-1.5 rounded border border-gray-300 px-2 py-1 dark:border-gray-600">
        <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts…"
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none dark:text-gray-200"
          aria-label="Search contacts to link"
        />
      </div>
      {isLoading && <p className="text-xs text-gray-400">Loading…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-xs text-gray-400">No contacts found.</p>
      )}
      <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
        {filtered.map((contact) => (
          <li key={contact.id}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleLink(contact.id)}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 dark:hover:bg-gray-700"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="truncate font-medium text-gray-900 dark:text-gray-100">{contact.name}</span>
                {(contact.role || contact.company) && (
                  <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {[contact.role, contact.company].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
              <span className="ml-2 shrink-0 text-xs text-blue-600 dark:text-blue-400">Link</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onDone?.()}
        className="self-end text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        Cancel
      </button>
    </div>
  );
}

export default ContactLinkDropdown;
