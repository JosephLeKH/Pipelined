/** Panel header: company logo, role title, company name, close and delete actions. */

import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";

import CompanyLogo from "./CompanyLogo";

export function DetailPanelHeader({ application, onClose, onDelete }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <CompanyLogo company_domain={application.company_domain ?? null} company={application.company ?? ""} size={32} />
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{application.role_title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{application.company}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-400"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 dark:hover:bg-rose-900/30"
          aria-label="Delete application"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
