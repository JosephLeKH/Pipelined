/** 8 px color dot for tag list rows and input tokens. */

function TagDot({ color, className = "" }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

export default TagDot;
