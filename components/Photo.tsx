"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { GENRE_BY_ID, type GenreId, type Spot } from "@/lib/data";
import { Cover } from "./Cover";

/**
 * One image, done properly: responsive srcset, lazy by default, fades in over a
 * paper-colored placeholder once decoded, and falls back to a labeled swatch
 * if the file can't be reached. The parent sets the box (aspect-ratio).
 */
export default function Photo({
  src,
  srcSet,
  sizes,
  alt,
  genre,
  eager,
  position,
  fallback,
}: {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  genre?: GenreId;
  eager?: boolean;
  /** object-position, for shots whose subject sits off-center */
  position?: string;
  /** shown instead when the file can't be reached */
  fallback?: ReactNode;
}) {
  const [state, setState] = useState<"loading" | "in" | "failed">("loading");
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setState("loading");
    // cached images can finish before hydration attaches onLoad
    const el = ref.current;
    if (el?.complete) setState(el.naturalWidth ? "in" : "failed");
  }, [src]);

  if (state === "failed" && fallback) return <>{fallback}</>;
  if (state === "failed") {
    const g = genre ? GENRE_BY_ID[genre] : null;
    return (
      <span className="img-fallback" role="img" aria-label={alt}>
        <span>{g ? g.label : "Photo"}</span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      className={`ph ${state === "in" ? "ph-in" : ""}`}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : undefined}
      referrerPolicy="no-referrer"
      style={position ? { objectPosition: position } : undefined}
      onLoad={() => setState("in")}
      onError={() => setState("failed")}
    />
  );
}

/** A place's cover (lib/photos → frontFor): its photo, or its matchbook. The parent sets the box. */
export function FrontPic({ spot, sizes, widths = [330, 500], eager, alt }: { spot: Spot; sizes: string; widths?: number[]; eager?: boolean; alt?: string }) {
  return <Cover spot={spot} sizes={sizes} widths={widths} eager={eager} alt={alt} />;
}

/** A little square of the cover, beside a name in a list. */
export function Thumb({ spot, w = 64 }: { spot: Spot; w?: number }) {
  return (
    <span className="thumb" aria-hidden style={{ width: w, height: w }}>
      <Cover spot={spot} sizes={`${w}px`} alt="" small />
    </span>
  );
}
