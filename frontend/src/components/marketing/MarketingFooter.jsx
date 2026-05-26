/** Dark multi-column marketing footer per Linear landing pattern. */

import { Link } from "react-router-dom";

import GitBranch from "lucide-react/dist/esm/icons/git-branch";

import { FooterLink, FooterStubLink } from "./FooterLink";

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Capture", stub: true },
      { label: "Plan", stub: true },
      { label: "Apply", stub: true },
      { label: "Prep", stub: true },
      { label: "Review", stub: true },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    heading: "Features",
    links: [
      { label: "Today", stub: true },
      { label: "Co-pilot", stub: true },
      { label: "Apply Pack", stub: true },
      { label: "Mock Interview", stub: true },
      { label: "Resume Insights", stub: true },
      { label: "Autopilot", stub: true },
      { label: "Watchlist", stub: true },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", stub: true },
      { label: "Method", stub: true },
      { label: "Brand", stub: true },
      { label: "Careers", stub: true },
      { label: "Students", to: "/#testimonials" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Docs", stub: true },
      { label: "Changelog", to: "/#changelog" },
      { label: "Status", stub: true },
      { label: "Open source", stub: true },
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Contact", stub: true },
      { label: "GitHub", stub: true },
      { label: "X/Twitter", stub: true },
      { label: "Discord", stub: true },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "DPA", stub: true },
    ],
  },
];

function FooterColumn({ heading, links }) {
  return (
    <div>
      <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-white/55">
        {heading}
      </p>
      <ul className="flex flex-col gap-2">
        {links.map(({ label, to, href, stub }) => (
          <li key={label}>
            {stub ? (
              <FooterStubLink>{label}</FooterStubLink>
            ) : (
              <FooterLink to={to} href={href}>
                {label}
              </FooterLink>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MarketingFooter() {
  return (
    <footer className="border-t border-border-1 bg-surface-inverse text-white/70">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(6,minmax(0,1fr))]">
          <div className="lg:col-span-1">
            <Link to="/" className="marketing-focus inline-flex items-center gap-1.5 rounded-md">
              <GitBranch className="h-4 w-4 text-brand-700" strokeWidth={2} aria-hidden="true" />
              <span className="text-[0.9375rem] font-semibold text-white">Pipelined</span>
            </Link>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <FooterColumn key={col.heading} {...col} />
          ))}
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs italic text-white/55">
          Built by a Stanford CS student · © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
