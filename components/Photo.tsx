"use client";

import { useEffect, useRef, useState } from "react";
import { GENRE_BY_ID, type GenreId, type Spot } from "@/lib/data";
import { commonsSrc, coverFor } from "@/lib/photos";

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
}: {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  genre?: GenreId;
  eager?: boolean;
  /** object-position, for shots whose subject sits off-center */
  position?: string;
}) {
  const [state, setState] = useState<"loading" | "in" | "failed">("loading");
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setState("loading");
    // cached images can finish before hydration attaches onLoad
    const el = ref.current;
    if (el?.complete) setState(el.naturalWidth ? "in" : "failed");
  }, [src]);

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
      // @ts-expect-error: valid attribute, React 18 types lag
      fetchpriority={eager ? "high" : undefined}
      referrerPolicy="no-referrer"
      style={position ? { objectPosition: position } : undefined}
      onLoad={() => setState("in")}
      onError={() => setState("failed")}
    />
  );
}

/** A little dish print at the end of a menu line, like a diner's photo menu. */
export function Thumb({ spot, w = 64 }: { spot: Spot; w?: number }) {
  const c = coverFor(spot);
  return (
    <span className="thumb" aria-hidden>
      <Photo src={commonsSrc(c.file, 330)} srcSet={`${commonsSrc(c.file, 330)} 330w, ${commonsSrc(c.file, 500)} 500w`} sizes={`${w}px`} alt="" genre={spot.genres[0]} />
    </span>
  );
}
