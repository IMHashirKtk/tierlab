import Image from "next/image";

/** Decorative mark: the surrounding home link provides the accessible name. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/icons/icon.svg?v=tier-board-1"
      width={36}
      height={36}
      alt=""
      aria-hidden="true"
      unoptimized
      className={`shrink-0 ${className}`}
    />
  );
}
