/** Negotiation tab: template picker + auto-filled script for a selected offer. */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import Check from "lucide-react/dist/esm/icons/check";
import Copy from "lucide-react/dist/esm/icons/copy";

import { NEGOTIATION_TEMPLATES, COPY_RESET_MS } from "../lib/constants";
import { Button } from "./ui/button";

const SELECT_CLS = "border border-input rounded-md bg-background text-foreground focus:border-ring focus:ring-1 focus:ring-ring/20 focus:outline-none transition-colors text-sm px-3 py-2 font-sans w-full";

function TotalCompBreakdown({ offer }) {
  const base = Number(offer.offer_details?.base_salary) || 0;
  const equity = Number(offer.offer_details?.equity_annual_value) || 0;
  const signing = Number(offer.offer_details?.signing_bonus) || 0;
  const vestingYears = Number(offer.offer_details?.vesting_years) || 4;
  const annualSigning = vestingYears > 0 ? Math.round(signing / vestingYears) : 0;
  const total = base + equity + annualSigning;

  const fmt = (n) => n > 0 ? `$${n.toLocaleString()}` : "—";

  return (
    <div className="rounded-xl bg-card border border-border p-4 flex flex-col gap-2">
      <h3 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">Annual Value Breakdown</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">Base Salary</span>
        <span className="font-medium text-foreground text-right">{fmt(base)}</span>
        <span className="text-muted-foreground">Equity (annual)</span>
        <span className="font-medium text-foreground text-right">{fmt(equity)}</span>
        <span className="text-muted-foreground">Signing (amortized)</span>
        <span className="font-medium text-foreground text-right">{fmt(annualSigning)}</span>
        <span className="border-t border-border pt-1 font-semibold text-foreground">Est. Annual Total</span>
        <span className="border-t border-border pt-1 font-bold text-primary text-right">{total > 0 ? fmt(total) : "—"}</span>
      </div>
    </div>
  );
}

export function OfferNegotiationPanel({ apps }) {
  const [selectedAppId, setSelectedAppId] = useState(apps[0]?.id ?? null);
  const [templateId, setTemplateId] = useState(NEGOTIATION_TEMPLATES[0].id);
  const [copied, setCopied] = useState(false);

  const selectedApp = apps.find((a) => a.id === selectedAppId) ?? apps[0];
  const template = NEGOTIATION_TEMPLATES.find((t) => t.id === templateId) ?? NEGOTIATION_TEMPLATES[0];
  const script = selectedApp ? template.build(selectedApp) : "";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    }).catch(() => {
      toast.error("Failed to copy script to clipboard.");
    });
  }, [script]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4">
        {apps.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="neg-offer-select">Offer</label>
            <select
              id="neg-offer-select"
              value={selectedAppId ?? ""}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className={SELECT_CLS}
            >
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.company ?? "Unknown"} — {app.role_title ?? ""}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="neg-template-select">Template</label>
          <select
            id="neg-template-select"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className={SELECT_CLS}
          >
            {NEGOTIATION_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedApp && <TotalCompBreakdown offer={selectedApp} />}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Negotiation Script</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs h-auto px-3 py-1.5"
            aria-label="Copy script to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <textarea
          readOnly
          value={script}
          rows={16}
          className="w-full rounded-lg border border-border bg-muted p-4 font-mono text-sm text-foreground"
          aria-label="Negotiation script"
        />
      </div>
    </div>
  );
}
