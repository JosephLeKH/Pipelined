/** Sidebar logo row — wordmark + chevron, collapses to GitBranch mark. */

import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import GitBranch from "lucide-react/dist/esm/icons/git-branch";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../../lib/utils";

function SidebarLogo({ collapsed, user, onLogout }) {
  return (
    <div className={cn("flex h-12 shrink-0 items-center border-b border-border-1 px-3", collapsed && "justify-center px-0")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Workspace menu"
            className={cn(
              "flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-sm font-semibold text-text-1",
              "hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:focus-visible:ring-1",
              collapsed && "w-auto justify-center",
            )}
          >
            {collapsed ? (
              <GitBranch className="h-5 w-5 text-brand-600" aria-hidden="true" />
            ) : (
              <>
                <span className="truncate tracking-[-0.022em]">Pipelined</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-text-3" aria-hidden="true" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{user?.display_name ?? user?.email ?? "Account"}</p>
            {user?.email && user?.display_name && (
              <p className="text-xs text-text-3">{user.email}</p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default SidebarLogo;
