"use client";

import { useEffect, useRef, useState } from "react";
import { GENRE_BY_ID, type GenreId, type Spot } from "@/lib/data";
import { frontFor } from "@/lib/photos";
import { useApp } from "./Providers";
import Storefront from "./Storefront";

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
      fetchPriority={eager ? "high" : undefined}
      referrerPolicy="no-referrer"
      style={position ? { objectPosition: position } : undefined}
      onLoad={() => setState("in")}
      onError={() => setState("failed")}
    />
  );
}

/**
 * A place from the sidewalk, the same picture its page opens with (lib/photos → frontFor): a
 * photo of the front, or our sketch of it. The parent sets the box.
 */
export function FrontPic({ spot, sizes, widths = [330, 500], eager, alt }: { spot: Spot; sizes: string; widths?: number[]; eager?: boolean; alt?: string }) {
  const { covers } = useApp();
  const f = frontFor(spot, covers[spot.id]);
  if (f.kind === "sketch") return <Storefront spot={spot} mini />;
  return <Photo src={f.src(widths[0])} srcSet={f.srcSet?.(widths)} sizes={f.srcSet ? sizes : undefined} alt={alt ?? f.alt} genre={spot.genres[0]} eager={eager} />;
}

/** A little print of the front at the end of a menu line. */
export function Thumb({ spot, w = 64 }: { spot: Spot; w?: number }) {
  return (
    <span className="thumb" aria-hidden>
      <FrontPic spot={spot} sizes={`${w}px`} alt="" />
    </span>
  );
}
