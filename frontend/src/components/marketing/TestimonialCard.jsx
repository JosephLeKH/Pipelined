/** Single testimonial card — placeholder quotes flagged for launch review. */

// TODO(marketing): Replace placeholder quotes with real student testimonials once permission is granted.

export default function TestimonialCard({ quote, name, school }) {
  return (
    <figure
      data-placeholder="true"
      className="flex h-60 flex-col justify-between rounded-xl border border-border-1 bg-surface-0 p-6"
    >
      <blockquote className="line-clamp-5 text-[0.9375rem] leading-[1.55] text-text-1">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-4">
        <p className="text-[0.8125rem] font-semibold text-text-1">{name}</p>
        <p className="text-xs text-text-3">{school}</p>
      </figcaption>
    </figure>
  );
}
