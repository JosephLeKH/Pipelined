/** Sidebar footer — user avatar and email, collapses to avatar only. */

import LogOut from "lucide-react/dist/esm/icons/log-out";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";

import { useAuth } from "../../context/AuthContext";
import { resetUser } from "../../lib/analytics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../../lib/utils";

function UserAvatar({ user }) {
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.display_name ?? "Profile"}
        className="h-7 w-7 rounded-full object-cover"
      />
    );
  }
  const seed = user?.display_name ?? user?.email ?? "U";
  const initial = (seed[0] ?? "U").toUpperCase();
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
      {initial}
    </span>
  );
}

function SidebarUserMenu({ collapsed }) {
  const { user, logout } = useAuth();

  async function handleLogout() {
    resetUser();
    await logout();
  }

  return (
    <div className={cn("shrink-0 border-t border-border-1 p-2", collapsed && "flex justify-center")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="User menu"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
              "hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:focus-visible:ring-1",
              collapsed && "w-auto justify-center px-0",
            )}
          >
            <UserAvatar user={user} />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate text-xs text-text-2">{user?.email}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-3" aria-hidden="true" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={collapsed ? "center" : "start"} side="top" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{user?.display_name ?? user?.email ?? "Account"}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default SidebarUserMenu;
