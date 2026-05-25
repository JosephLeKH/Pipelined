/** Compact user avatar menu for the top bar. */

import LogOut from "lucide-react/dist/esm/icons/log-out";
import User from "lucide-react/dist/esm/icons/user";
import { Link } from "react-router-dom";

import { resetUser } from "../../lib/analytics";
import { useAuth } from "../../context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

function UserAvatar({ user }) {
  if (user?.avatar_url) {
    return (
      <img src={user.avatar_url} alt={user.display_name ?? "Profile"} className="h-7 w-7 rounded-full object-cover" />
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

function TopBarUserMenu({ user }) {
  const { logout } = useAuth();

  async function handleLogout() {
    resetUser();
    await logout();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User menu"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:focus-visible:ring-1"
        >
          <UserAvatar user={user} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user?.display_name ?? user?.email ?? "Account"}</p>
          {user?.email && user?.display_name && (
            <p className="text-xs text-text-3">{user.email}</p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex cursor-pointer items-center gap-2">
            <User className="h-4 w-4" aria-hidden="true" />
            Profile & Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TopBarUserMenu;
