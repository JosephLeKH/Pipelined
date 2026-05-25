/** Footer stub link — toast for unbuilt pages instead of 404. */

import { toast } from "sonner";

export function FooterStubLink({ children }) {
  return (
    <button
      type="button"
      data-stub="true"
      className="marketing-focus text-left text-[13px] text-white/75 transition-colors duration-120 hover:text-white"
      onClick={() => toast.info("Coming soon")}
    >
      {children}
    </button>
  );
}

export function FooterLink({ to, href, children }) {
  if (to) {
    return (
      <a
        href={to}
        className="marketing-focus text-[13px] text-white/75 transition-colors duration-120 hover:text-white"
      >
        {children}
      </a>
    );
  }

  return (
    <a
      href={href}
      className="marketing-focus text-[13px] text-white/75 transition-colors duration-120 hover:text-white"
    >
      {children}
    </a>
  );
}
