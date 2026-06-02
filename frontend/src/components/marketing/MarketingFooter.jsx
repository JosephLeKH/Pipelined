/** Minimal marketing footer — brand mark, essential links, copyright. */

import { Link } from "react-router-dom";
import GitBranch from "lucide-react/dist/esm/icons/git-branch";
import Github from "lucide-react/dist/esm/icons/github";
import Linkedin from "lucide-react/dist/esm/icons/linkedin";
import Globe from "lucide-react/dist/esm/icons/globe";

const LINKS = [
  { label: "Changelog", to: "/#changelog" },
  { label: "GitHub", href: "https://github.com/JosephLeKH/Pipelined", external: true },
];

const AUTHOR_LINKS = [
  { label: "Joseph Le on GitHub", href: "https://github.com/JosephLeKH", Icon: Github },
  { label: "Joseph Le on LinkedIn", href: "https://www.linkedin.com/in/hung-le-", Icon: Linkedin },
  { label: "josephle.dev", href: "https://josephle.dev", Icon: Globe },
];

const LINK_CLASS =
  "marketing-focus rounded-sm text-[0.8125rem] text-text-2 transition-colors duration-150 hover:text-brand-700 motion-reduce:transition-none";

const AUTHOR_ICON_CLASS =
  "marketing-focus inline-flex h-6 w-6 items-center justify-center rounded text-text-3 transition-colors duration-150 hover:text-brand-700 motion-reduce:transition-none";

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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-6 py-4 text-xs text-text-3">
          <span>© {new Date().getFullYear()} Pipelined</span>
          <span aria-hidden="true">·</span>
          <span>Built by Joseph Le, Stanford CS &apos;28</span>
          <span className="ml-1 inline-flex items-center gap-0.5">
            {AUTHOR_LINKS.map(({ label, href, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={label}
                className={AUTHOR_ICON_CLASS}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}
