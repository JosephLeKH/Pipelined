/** Panel header: company logo, role title, company name, close and delete actions. */

import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";

import CompanyLogo from "./CompanyLogo";
import { Button } from "./ui/button";

export function DetailPanelHeader({ application, onClose, onDelete }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-6 py-4">
      <div className="flex items-center gap-3">
        <CompanyLogo company_domain={application.company_domain ?? null} company={application.company ?? ""} size={32} />
        <div>
          <h2 id="detail-panel-heading" className="text-lg font-semibold font-display text-foreground">{application.role_title}</h2>
          <p className="text-sm text-muted-foreground">{application.company}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close panel"
          className="bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label="Delete application"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
