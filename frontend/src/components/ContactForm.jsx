/** Inline form for creating a new contact, optionally linking it to an application. */

import { useState } from "react";

import { useCreateContact, useLinkContact, useRelationshipSuggestion } from "../hooks/useContacts";
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

function ContactFormNameField({ form, handleChange, disabled }) {
  return (
    <div className="col-span-2 flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-name">
        Name <span className="text-red-500">*</span>
      </label>
      <input id="contact-name" name="name" value={form.name} onChange={handleChange}
        required maxLength={200} className={INPUT_BASE} placeholder="Jane Smith" disabled={disabled} />
    </div>
  );
}

function RelationshipSuggestionHint({ suggestion }) {
  if (!suggestion) return null;
  const { suggested_type, confidence, reason } = suggestion;
  return (
    <p className="text-xs text-brand-600 dark:text-brand-400">
      Suggestion: <span className="font-medium">{suggested_type.replace("_", " ")}</span>
      {" "}({Math.round(confidence * 100)}% confidence) — {reason}
    </p>
  );
}

function ContactFormDetailFields({ form, handleChange, disabled, suggestion }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" value={form.company} onChange={handleChange} maxLength={200} className={INPUT_BASE} placeholder="Acme Corp" disabled={disabled} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-role">Role</label>
        <input id="contact-role" name="role" value={form.role} onChange={handleChange} maxLength={200} className={INPUT_BASE} placeholder="Recruiter" disabled={disabled} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-email">Email</label>
        <input id="contact-email" name="email" type="email" value={form.email} onChange={handleChange} maxLength={254} className={INPUT_BASE} placeholder="jane@acme.com" disabled={disabled} />
      </div>
      <div className="col-span-2 flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor="contact-relationship">Relationship</label>
        <select id="contact-relationship" name="relationship" value={form.relationship} onChange={handleChange} className={INPUT_BASE} disabled={disabled}>
          {RELATIONSHIP_OPTIONS.map((r) => (<option key={r} value={r}>{r.replace("_", " ")}</option>))}
        </select>
        <RelationshipSuggestionHint suggestion={suggestion} />
      </div>
    </>
  );
}

function ContactFormFields({ form, handleChange, disabled, suggestion }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <ContactFormNameField form={form} handleChange={handleChange} disabled={disabled} />
      <ContactFormDetailFields form={form} handleChange={handleChange} disabled={disabled} suggestion={suggestion} />
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
  const { data: suggestionRes } = useRelationshipSuggestion(applicationId, form.email);
  const suggestion = suggestionRes?.data ?? null;
  const isPending = creating || linking;

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
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
      onError: (err) => {
        const errorMsg = err?.response?.data?.error?.message || "Failed to create contact. Please try again.";
        setError(errorMsg);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${CARD_BASE} px-3 py-3`}>
      <ContactFormFields form={form} handleChange={handleChange} disabled={isPending} suggestion={suggestion} />
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
      <ContactFormActions isPending={isPending} nameValue={form.name} onDone={onDone} />
    </form>
  );
}

export default ContactForm;
