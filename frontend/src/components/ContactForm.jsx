/** Inline form for creating a new contact, optionally linking it to an application. */

import { useState } from "react";

import { useCreateContact, useLinkContact } from "../hooks/useContacts";
import { RELATIONSHIP_OPTIONS } from "../lib/constants";
import { INPUT_BASE, CARD_BASE, BUTTON_PRIMARY } from "../lib/designTokens";

const INITIAL_FORM = {
  name: "",
  company: "",
  role: "",
  email: "",
  relationship: "other",
  notes: "",
};

function ContactFormNameField({ form, handleChange }) {
  return (
    <div className="col-span-2 flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-name">
        Name <span className="text-red-500">*</span>
      </label>
      <input id="contact-name" name="name" value={form.name} onChange={handleChange}
        required maxLength={200} className={INPUT_BASE} placeholder="Jane Smith" />
    </div>
  );
}

function ContactFormDetailFields({ form, handleChange }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" value={form.company} onChange={handleChange} maxLength={200} className={INPUT_BASE} placeholder="Acme Corp" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-role">Role</label>
        <input id="contact-role" name="role" value={form.role} onChange={handleChange} maxLength={200} className={INPUT_BASE} placeholder="Recruiter" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-email">Email</label>
        <input id="contact-email" name="email" type="email" value={form.email} onChange={handleChange} maxLength={254} className={INPUT_BASE} placeholder="jane@acme.com" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-relationship">Relationship</label>
        <select id="contact-relationship" name="relationship" value={form.relationship} onChange={handleChange} className={INPUT_BASE}>
          {RELATIONSHIP_OPTIONS.map((r) => (<option key={r} value={r}>{r.replace("_", " ")}</option>))}
        </select>
      </div>
    </>
  );
}

function ContactFormFields({ form, handleChange }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <ContactFormNameField form={form} handleChange={handleChange} />
      <ContactFormDetailFields form={form} handleChange={handleChange} />
    </div>
  );
}

function ContactFormActions({ isPending, nameValue, onDone }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="submit"
        disabled={isPending || !nameValue.trim()}
        className={`${BUTTON_PRIMARY} text-xs px-3 py-1.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isPending ? "Saving…" : "Add Contact"}
      </button>
      <button type="button" onClick={() => onDone?.()} className="text-gray-500 hover:bg-gray-100 rounded-button active:scale-[0.98] transition-all duration-150 font-medium text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:text-gray-400 dark:hover:bg-gray-700">
        Cancel
      </button>
    </div>
  );
}

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
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
    createContact(body, {
      onSuccess: (res) => {
        const newId = res?.data?.id ?? res?.id;
        if (applicationId && newId) {
          linkContact({ contactId: newId, applicationId }, { onSuccess: () => onDone?.(), onError: () => onDone?.() });
        } else {
          onDone?.();
        }
      },
      onError: () => setError("Failed to create contact. Please try again."),
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${CARD_BASE} px-3 py-3`}>
      <ContactFormFields form={form} handleChange={handleChange} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <ContactFormActions isPending={isPending} nameValue={form.name} onDone={onDone} />
    </form>
  );
}

export default ContactForm;
