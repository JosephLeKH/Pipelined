/** Trust band. Slim social-proof strip with university affiliations under the hero. */

const SCHOOLS = [
  "Stanford",
  "MIT",
  "UC Berkeley",
  "Carnegie Mellon",
  "Waterloo",
  "Cornell",
];

export default function TrustBand() {
  return (
    <section
      aria-label="Trusted by students at"
      className="border-y border-border-1 bg-surface-1"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 py-8 sm:flex-row sm:gap-10">
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-text-3">
          Trusted by students at
        </p>
        <ul className="flex flex-1 flex-wrap items-center justify-center gap-x-8 gap-y-2 sm:justify-start">
          {SCHOOLS.map((school) => (
            <li
              key={school}
              className="text-sm font-semibold tracking-tight text-text-2"
            >
              {school}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
