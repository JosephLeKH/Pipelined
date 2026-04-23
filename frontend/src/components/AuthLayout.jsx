/** Split-screen layout used by all auth pages. Left: form, right: brand panel (hidden on mobile). */

import Check from "lucide-react/dist/esm/icons/check";

const FEATURES = [
  "Track 10+ job boards",
  "AI-powered resume fit",
  "Free forever",
];

const TESTIMONIAL = {
  quote: "Pipelined helped me land my internship at Google.",
  author: "Stanford CS, 2026",
};

function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 p-14 text-white">
      <div>
        <p className="text-2xl font-bold tracking-tight">Pipelined</p>
        <p className="mt-3 text-xl font-medium text-brand-100">Your job search, organized.</p>
        <ul className="mt-10 flex flex-col gap-4">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm text-brand-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Check className="h-3 w-3 text-white" />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>
      <blockquote className="mt-12 border-t border-white/20 pt-6">
        <p className="text-sm italic text-brand-200">&ldquo;{TESTIMONIAL.quote}&rdquo;</p>
        <footer className="mt-2 text-xs text-brand-300">— {TESTIMONIAL.author}</footer>
      </blockquote>
    </div>
  );
}

function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-12 dark:bg-gray-900 lg:w-[55%]">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <p className="mb-8 text-center text-xl font-bold text-brand-600 lg:hidden">Pipelined</p>
          {children}
        </div>
      </div>
      <BrandPanel />
    </div>
  );
}

export default AuthLayout;
