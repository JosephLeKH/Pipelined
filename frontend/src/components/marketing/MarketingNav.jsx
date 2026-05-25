/** Sticky marketing top nav — 56 px, backdrop blur, mobile drawer. */

import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import GitBranch from "lucide-react/dist/esm/icons/git-branch";
import Menu from "lucide-react/dist/esm/icons/menu";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const NAV_LINKS = [
  { label: "Product", to: "/#capture" },
  { label: "Changelog", to: "/#changelog" },
  { label: "Students", to: "/#testimonials" },
  { label: "Pricing", to: "/pricing" },
];

function MarketingNavLink({ to, children, onClick, className = "" }) {
  const isHash = to.startsWith("/#");
  const base =
    "rounded-md px-1.5 py-1 text-[13px] font-medium text-text-2 transition-colors duration-120 hover:text-text-1 marketing-focus";

  if (isHash) {
    return (
      <a href={to.replace("/", "")} className={`${base} ${className}`} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <NavLink to={to} className={`${base} ${className}`} onClick={onClick}>
      {children}
    </NavLink>
  );
}

export default function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border-1 bg-surface-0/85 backdrop-blur supports-[backdrop-filter]:bg-surface-0/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="marketing-focus flex items-center gap-1.5 rounded-md">
          <GitBranch className="h-4 w-4 text-brand-700" strokeWidth={2} aria-hidden="true" />
          <span className="text-[15px] font-semibold tracking-tight text-text-1">Pipelined</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_LINKS.map(({ label, to }) => (
            <MarketingNavLink key={label} to={to}>
              {label}
            </MarketingNavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="marketing-focus hidden rounded-md px-2 py-1 text-[13px] font-medium text-text-2 transition-colors duration-120 hover:text-text-1 sm:inline"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="marketing-focus rounded-md bg-brand-700 px-3 py-1.5 text-[13px] font-medium text-white transition-colors duration-120 hover:bg-brand-800"
          >
            Sign up
          </Link>
          <button
            type="button"
            className="marketing-focus rounded-md p-2 text-text-2 md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="fixed inset-y-0 right-0 left-auto top-0 h-full w-[min(100%,20rem)] max-w-none translate-x-0 translate-y-0 rounded-none border-l border-border-1 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
          <DialogHeader>
            <DialogTitle className="text-left text-text-1">Menu</DialogTitle>
          </DialogHeader>
          <nav className="mt-4 flex flex-col gap-1" aria-label="Mobile">
            {NAV_LINKS.map(({ label, to }) => (
              <MarketingNavLink key={label} to={to} onClick={closeMobile} className="py-2">
                {label}
              </MarketingNavLink>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2 pt-8">
            <Link
              to="/login"
              className="marketing-focus rounded-md px-1.5 py-2 text-[13px] font-medium text-text-2"
              onClick={closeMobile}
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="marketing-focus rounded-md bg-brand-700 px-3 py-2 text-center text-[13px] font-medium text-white hover:bg-brand-800"
              onClick={closeMobile}
            >
              Sign up
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
