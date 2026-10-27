/** Decorative mark: the surrounding home link provides the accessible name. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed local SVG needs no image-loader JavaScript
    <img
      src="/icons/icon.svg?v=tier-board-1"
      width={36}
      height={36}
      alt=""
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    />
  );
}
