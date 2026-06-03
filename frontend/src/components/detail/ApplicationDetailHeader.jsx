/** Application detail page header: back link, company logo + title, actions menu. */

import { Link } from "react-router-dom";

import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import CompanyLogo from "../CompanyLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ICON_BUTTON } from "../../lib/designTokens";

function BackLink({ to }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm text-text-3 transition-colors duration-120 hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back
    </Link>
  );
}

function ActionsMenu({ onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Application actions"
          className={`${ICON_BUTTON} h-9 w-9`}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuItem
          onSelect={onDelete}
          className="text-brand-700 focus:bg-brand-50 focus:text-brand-700 dark:text-brand-300 dark:focus:bg-brand-900/30 dark:focus:text-brand-200"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete application
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ApplicationDetailHeader({ application, backTo = "/dashboard", onDelete }) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <BackLink to={backTo} />
        <ActionsMenu onDelete={onDelete} />
      </div>
      <div className="flex items-start gap-4">
        <CompanyLogo
          company_domain={application.company_domain ?? null}
          company={application.company ?? ""}
          size={48}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-3">{application.company}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-text-1 sm:text-3xl">
            {application.role_title}
          </h1>
        </div>
      </div>
    </header>
  );
}

export default ApplicationDetailHeader;
