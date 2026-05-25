/** IntersectionObserver hook for marketing scroll-reveal animations. */

import { useEffect, useRef } from "react";

const REVEAL_THRESHOLD = 0.12;

export function useMarketingReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      node.classList.add("in-view");
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      },
      { threshold: REVEAL_THRESHOLD },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return ref;
}
