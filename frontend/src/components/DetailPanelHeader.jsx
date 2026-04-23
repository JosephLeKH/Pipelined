/** Panel header: company logo, role title, company name, close and delete actions. */

import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";

import CompanyLogo from "./CompanyLogo";

export function DetailPanelHeader({ application, onClose, onDelete }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <CompanyLogo company_domain={application.company_domain ?? null} company={application.company ?? ""} size={32} />
        <div>
          <h2 id="detail-panel-heading" className="text-lg font-semibold font-display text-gray-900 dark:text-gray-100">{application.role_title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{application.company}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-400"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 dark:hover:bg-rose-900/30"
          aria-label="Delete application"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
