/** Minimal marketing footer — brand mark, essential links, copyright. */

import { Link } from "react-router-dom";
import GitBranch from "lucide-react/dist/esm/icons/git-branch";

const LINKS = [
  { label: "Pricing", to: "/pricing" },
  { label: "Changelog", to: "/#changelog" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "GitHub", href: "https://github.com", external: true },
];

const LINK_CLASS =
  "marketing-focus rounded-sm text-[0.8125rem] text-text-2 transition-colors duration-150 hover:text-brand-700 motion-reduce:transition-none";

function FooterLink({ label, to, href, external }) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={LINK_CLASS}>
        {label}
      </a>
    );
  }
  if (to?.startsWith("/#")) {
    return (
      <a href={to} className={LINK_CLASS}>
        {label}
      </a>
    );
  }
  return (
    <Link to={to} className={LINK_CLASS}>
      {label}
    </Link>
  );
}

export default function MarketingFooter() {
  return (
    <footer className="border-t border-border-1 bg-surface-1">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/"
          className="marketing-focus inline-flex items-center gap-1.5 rounded-md self-start sm:self-auto"
          aria-label="Pipelined home"
        >
          <GitBranch className="h-4 w-4 text-brand-700" strokeWidth={2} aria-hidden="true" />
          <span className="text-[0.9375rem] font-semibold text-text-1">Pipelined</span>
        </Link>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {LINKS.map((link) => (
              <li key={link.label}>
                <FooterLink {...link} />
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-border-1">
        <p className="mx-auto max-w-6xl px-6 py-4 text-center text-xs text-text-3">
          © {new Date().getFullYear()} Pipelined · Built by a Stanford CS student
        </p>
      </div>
    </footer>
  );
}
