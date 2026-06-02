import { useState, useMemo } from "react";
import Plus from "lucide-react/dist/esm/icons/plus";
import Search from "lucide-react/dist/esm/icons/search";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import {
  useApplications,
  useCreateApplication,
  useUpdateApplication,
} from "../hooks/useApplications";
import { OFFER_STAGE } from "../lib/constants";

const CANDIDATE_LIMIT = 100;
const EXCLUDED_STAGES = new Set(["Offer", "Rejected"]);

function matchesQuery(app, query) {
  if (!query) return true;
  const company = (app.company ?? "").toLowerCase();
  const role = (app.role_title ?? "").toLowerCase();
  return company.includes(query) || role.includes(query);
}

function ExistingTab({ candidates, onPick, isPending }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const matches = useMemo(
    () => candidates.filter((app) => matchesQuery(app, query)),
    [candidates, query]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search applications..."
          aria-label="Search applications"
          className="pl-9"
        />
      </div>
      <CandidateList matches={matches} hasAny={candidates.length > 0} onPick={onPick} isPending={isPending} />
    </div>
  );
}

function CandidateList({ matches, hasAny, onPick, isPending }) {
  if (matches.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        {hasAny
          ? "No applications match your search."
          : "No other applications yet. Use the New tab to create one."}
      </p>
    );
  }
  return (
    <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
      {matches.map((app) => (
        <li key={app.id}>
          <button
            type="button"
            onClick={() => onPick(app)}
            disabled={isPending}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {app.company ?? "Unknown"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {app.role_title ?? "—"} · {app.current_stage ?? ""}
              </p>
            </div>
            <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function parseOptionalInt(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}

function useNewOfferForm() {
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [signingBonus, setSigningBonus] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setCompany(""); setRoleTitle(""); setBaseSalary(""); setSigningBonus(""); setError("");
  }

  function validate() {
    if (!company.trim() || !roleTitle.trim()) {
      setError("Company and role are required.");
      return null;
    }
    setError("");
    return {
      company: company.trim(),
      roleTitle: roleTitle.trim(),
      baseSalary: parseOptionalInt(baseSalary),
      signingBonus: parseOptionalInt(signingBonus),
    };
  }

  return {
    company, setCompany, roleTitle, setRoleTitle,
    baseSalary, setBaseSalary, signingBonus, setSigningBonus,
    error, validate, reset,
  };
}

function NewOfferForm({ onSubmit, isPending }) {
  const form = useNewOfferForm();

  function handleSubmit(event) {
    event.preventDefault();
    const payload = form.validate();
    if (payload) onSubmit(payload, form.reset);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field id="new-offer-company" label="Company *" value={form.company} onChange={form.setCompany} placeholder="Anthropic" aria-required="true" />
        <Field id="new-offer-role" label="Role *" value={form.roleTitle} onChange={form.setRoleTitle} placeholder="MTS" aria-required="true" />
        <Field id="new-offer-base" label="Base salary ($)" type="number" min="0" value={form.baseSalary} onChange={form.setBaseSalary} placeholder="220000" />
        <Field id="new-offer-bonus" label="Signing bonus ($)" type="number" min="0" value={form.signingBonus} onChange={form.setSigningBonus} placeholder="25000" />
      </div>
      {form.error && (
        <p role="alert" className="text-sm text-destructive">{form.error}</p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add offer"}
        </Button>
      </div>
    </form>
  );
}

function Field({ id, label, value, onChange, ...inputProps }) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} {...inputProps} />
    </div>
  );
}

function buildOfferDetails(baseSalary, signingBonus) {
  const details = {};
  if (baseSalary !== null) details.base_salary = baseSalary;
  if (signingBonus !== null) details.signing_bonus = signingBonus;
  return Object.keys(details).length > 0 ? details : null;
}

export function AddOfferDialog({ open, onOpenChange }) {
  const [tab, setTab] = useState("existing");
  const { data } = useApplications({ limit: CANDIDATE_LIMIT });
  const updateApp = useUpdateApplication();
  const createApp = useCreateApplication();

  const candidates = useMemo(() => {
    const all = data?.data ?? [];
    return all.filter((app) => !EXCLUDED_STAGES.has(app.current_stage));
  }, [data]);

  async function handlePickExisting(app) {
    await updateApp.mutateAsync({ id: app.id, body: { current_stage: OFFER_STAGE } });
    onOpenChange(false);
  }

  async function handleCreateNew(payload, resetForm) {
    const created = await createApp.mutateAsync({
      company: payload.company,
      role_title: payload.roleTitle,
      source: "manual",
      current_stage: OFFER_STAGE,
    });
    const offerDetails = buildOfferDetails(payload.baseSalary, payload.signingBonus);
    if (offerDetails && created?.id) {
      await updateApp.mutateAsync({ id: created.id, body: { offer_details: offerDetails } });
    }
    resetForm();
    onOpenChange(false);
  }

  const isPending = updateApp.isPending || createApp.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add offer to compare</DialogTitle>
          <DialogDescription>
            Bring an existing application into the comparison, or create a new offer.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="existing" className="flex-1">Existing</TabsTrigger>
            <TabsTrigger value="new" className="flex-1">New</TabsTrigger>
          </TabsList>
          <TabsContent value="existing">
            <ExistingTab candidates={candidates} onPick={handlePickExisting} isPending={isPending} />
          </TabsContent>
          <TabsContent value="new">
            <NewOfferForm onSubmit={handleCreateNew} isPending={isPending} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
