/** Inline form for creating a new contact, optionally linking it to an application. */

import { useState } from "react";

import { useCreateContact, useLinkContact, useRelationshipSuggestion } from "../hooks/useContacts";
import { RELATIONSHIP_OPTIONS } from "../lib/constants";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "./ui/select";

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
      <label className="text-xs font-medium text-muted-foreground" htmlFor="contact-name">
        Name <span className="text-destructive">*</span>
      </label>
      <Input id="contact-name" name="name" value={form.name} onChange={handleChange}
        required maxLength={200} placeholder="Jane Smith" disabled={disabled} />
    </div>
  );
}

function RelationshipSuggestionHint({ suggestion }) {
  if (!suggestion) return null;
  const { suggested_type, confidence, reason } = suggestion;
  return (
    <p className="text-xs text-primary">
      Suggestion: <span className="font-medium">{suggested_type.replace("_", " ")}</span>
      {" "}({Math.round(confidence * 100)}% confidence) — {reason}
    </p>
  );
}

function ContactFormDetailFields({ form, handleChange, disabled, suggestion }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="contact-company">Company</label>
        <Input id="contact-company" name="company" value={form.company} onChange={handleChange} maxLength={200} placeholder="Acme Corp" disabled={disabled} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="contact-role">Role</label>
        <Input id="contact-role" name="role" value={form.role} onChange={handleChange} maxLength={200} placeholder="Recruiter" disabled={disabled} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="contact-email">Email</label>
        <Input id="contact-email" name="email" type="email" value={form.email} onChange={handleChange} maxLength={254} placeholder="jane@acme.com" disabled={disabled} />
      </div>
      <div className="col-span-2 flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="contact-relationship">Relationship</label>
        <Select value={form.relationship} onValueChange={(value) => handleChange({ target: { name: "relationship", value } })}>
          <SelectTrigger id="contact-relationship" disabled={disabled}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_OPTIONS.map((r) => (<SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>))}
          </SelectContent>
        </Select>
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
      <Button type="submit" size="sm" disabled={isPending || !nameValue.trim()}>
        {isPending ? "Saving…" : "Add Contact"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => onDone?.()}>Cancel</Button>
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl bg-card border border-border px-3 py-3">
      <ContactFormFields form={form} handleChange={handleChange} disabled={isPending} suggestion={suggestion} />
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      <ContactFormActions isPending={isPending} nameValue={form.name} onDone={onDone} />
    </form>
  );
}

export default ContactForm;
