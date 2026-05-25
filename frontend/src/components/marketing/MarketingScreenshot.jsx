/** Marketing screenshot with explicit dimensions and placeholder until PRD-04. */

import { useState } from "react";

import { screenshotPlaceholderDataUri } from "../../lib/marketingScreenshot";

export default function MarketingScreenshot({
  src,
  alt,
  width,
  height,
  label,
  eager = false,
  className = "",
}) {
  const placeholder = screenshotPlaceholderDataUri(width, height, label ?? alt);
  const [imgSrc, setImgSrc] = useState(src ?? placeholder);

  const handleError = () => setImgSrc(placeholder);

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={handleError}
      className={`w-full rounded-xl border border-border-1 ${className}`}
    />
  );
}
