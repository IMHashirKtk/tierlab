"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { getItemImageUrl } from "@/lib/image-url";

/** Keep a named item usable when its remote artwork is missing or blocked. */
export function ItemImage({ src, alt, className = "", draggable = false, ...imageProps }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  src?: string;
  alt: string;
  className?: string;
  draggable?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) {
    return <span role="img" aria-label={alt} title={alt} className={`inline-flex items-center justify-center bg-zinc-800 text-zinc-200 text-[10px] leading-tight text-center p-1 break-words overflow-hidden ${className}`}>{alt}</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element -- user and third-party assets, including data URLs
  return <img loading="lazy" decoding="async" {...imageProps} src={getItemImageUrl(src)} alt={alt} draggable={draggable} onError={() => setFailedSource(src)} className={className} />;
}
