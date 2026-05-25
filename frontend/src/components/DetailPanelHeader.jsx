/** Panel header: close, company logo, inline title, row actions menu. */

import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";

import CompanyLogo from "./CompanyLogo";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ICON_BUTTON } from "../lib/designTokens";

export function DetailPanelHeader({ application, onClose, onDelete }) {
  const title = `${application.company} · ${application.role_title}`;

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border-1 px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Close panel"
        className="h-7 w-7 shrink-0"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
      <CompanyLogo
        company_domain={application.company_domain ?? null}
        company={application.company ?? ""}
        size={24}
      />
      <h2
        id="detail-panel-heading"
        className="min-w-0 flex-1 truncate text-sm font-semibold text-text-1"
      >
        {title}
      </h2>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Application actions"
            className={`${ICON_BUTTON} h-7 w-7 shrink-0`}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem
            onSelect={onDelete}
            className="text-brand-700 focus:bg-brand-50 focus:text-brand-700 dark:text-brand-300 dark:focus:bg-brand-900/30 dark:focus:text-brand-200"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete application
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
