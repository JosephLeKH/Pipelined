/** Inline form for creating a new contact, optionally linking it to an application. */

import { useState } from "react";

import { useCreateContact, useLinkContact } from "../hooks/useContacts";
import { RELATIONSHIP_OPTIONS } from "../lib/constants";

const INITIAL_FORM = {
  name: "",
  company: "",
  role: "",
  email: "",
  relationship: "other",
  notes: "",
};

function ContactForm({ applicationId, onDone }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState(null);

  const { mutate: createContact, isPending: creating } = useCreateContact();
  const { mutate: linkContact, isPending: linking } = useLinkContact();

  const isPending = creating || linking;

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const body = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== "")
    );

    createContact(body, {
      onSuccess: (res) => {
        const newId = res?.data?.id ?? res?.id;
        if (applicationId && newId) {
          linkContact(
            { contactId: newId, applicationId },
            {
              onSuccess: () => onDone?.(),
              onError: () => onDone?.(),
            }
          );
        } else {
          onDone?.();
        }
      },
      onError: () => setError("Failed to create contact. Please try again."),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-gray-200 px-3 py-3 dark:border-gray-700">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-name">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            maxLength={200}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            placeholder="Jane Smith"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-company">
            Company
          </label>
          <input
            id="contact-company"
            name="company"
            value={form.company}
            onChange={handleChange}
            maxLength={200}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            placeholder="Acme Corp"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-role">
            Role
          </label>
          <input
            id="contact-role"
            name="role"
            value={form.role}
            onChange={handleChange}
            maxLength={200}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            placeholder="Recruiter"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-email">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            maxLength={254}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            placeholder="jane@acme.com"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-relationship">
            Relationship
          </label>
          <select
            id="contact-relationship"
            name="relationship"
            value={form.relationship}
            onChange={handleChange}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            {RELATIONSHIP_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending || !form.name.trim()}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Add Contact"}
        </button>
        <button
          type="button"
          onClick={() => onDone?.()}
          className="rounded px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default ContactForm;
