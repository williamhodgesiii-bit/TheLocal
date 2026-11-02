"use client";

import { memo } from "react";
import { GENRE_BY_ID, areaLabelOf, type Spot } from "@/lib/data";
import { frontFor } from "@/lib/photos";
import { hash } from "@/lib/images";
import { useMedia } from "./Providers";
import Photo from "./Photo";

/*
  Every place gets a cover. A real photo when there is one (the place's own, a member's, an
  openly licensed one, or Google's when that's switched on). Until then, a matchbook: the kind
  of thing you pocket on the way out of a good restaurant. Each one is set in its own type and
  ink from the place's name, so a shelf of them reads like a collection, not a placeholder.
*/

const INKS: [string, string, string][] = [
  ["#b23a24", "#f6eedc", "#22201c"],
  ["#2c5a43", "#f3e9d2", "#e0ae45"],
  ["#22201c", "#f4efe1", "#d0502f"],
  ["#d9a33a", "#22201c", "#b23a24"],
  ["#efe5cf", "#b23a24", "#2c5a43"],
  ["#26408b", "#f4efe1", "#e0ae45"],
  ["#5e2f3e", "#f2e4d3", "#e0ae45"],
  ["#2f5d62", "#f4efe1", "#e7b452"],
  ["#c2643c", "#fbf3e4", "#22201c"],
  ["#4d4b26", "#f4efe1", "#e8c26a"],
];
const STYLES = ["sign", "script", "serif", "stack"] as const;

/** a font size (in % of the cover's width) that keeps the longest line inside it */
function fit(lines: string[], perChar: number, max: number, min = 8) {
  const longest = Math.max(...lines.map((l) => l.length), 1);
  return Math.max(min, Math.min(max, 74 / (longest * perChar)));
}

export const Matchbook = memo(function Matchbook({ spot, small }: { spot: Spot; small?: boolean }) {
  const h = hash(spot.id);
  const [bg, fg, accent] = INKS[h % INKS.length];
  const style = STYLES[(h >>> 4) % STYLES.length];
  const name = spot.sign ?? spot.name;
  const words = name.split(/\s+/);
  const kind = GENRE_BY_ID[spot.genres[0]]?.short ?? "";
  const where = areaLabelOf(spot).split(" & ")[0];
  let size = 12;
  let lines = [name];
  if (style === "sign") {
    // two lines at most, split near the middle
    if (name.length > 11 && words.length > 1) {
      let best = 1;
      for (let i = 1; i < words.length; i++) if (Math.abs(words.slice(0, i).join(" ").length - name.length / 2) < Math.abs(words.slice(0, best).join(" ").length - name.length / 2)) best = i;
      lines = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
    }
    size = fit(lines, 0.56, 25);
  } else if (style === "stack") {
    lines = words.length > 4 ? [words.slice(0, 2).join(" "), ...words.slice(2)] : words;
    size = fit(lines, 0.58, 24) * (lines.length > 3 ? 0.86 : 1);
  } else if (style === "script") {
    size = fit([name.length > 14 && words.length > 1 ? words.slice(0, Math.ceil(words.length / 2)).join(" ") : name], 0.4, 24, 10);
  } else {
    size = fit([name.length > 12 && words.length > 1 ? words.reduce((a, b) => (a.length > b.length ? a : b)) : name], 0.46, 22, 10) * (name.length > 18 ? 0.9 : 1);
  }
  return (
    <span className={`mx mx-${style}${small ? " mx-small" : ""}`} style={{ ["--mx-bg" as string]: bg, ["--mx-fg" as string]: fg, ["--mx-ac" as string]: accent }} role="img" aria-label={spot.name}>
      <span className="mx-face">
        {style !== "serif" && <span className="mx-top">{style === "script" ? kind : where}</span>}
        {style === "serif" && <span className="mx-top">{kind}</span>}
        <span className="mx-name" style={{ fontSize: `${size}cqw` }}>
          {style === "sign" || style === "stack" ? lines.map((l, i) => <span key={i}>{l}</span>) : name}
        </span>
        {style === "script" && <span className="mx-rule" aria-hidden />}
        <span className="mx-foot">{style === "script" ? where : style === "serif" ? where : kind}</span>
      </span>
      <span className="mx-strike" aria-hidden />
    </span>
  );
});

/**
 * A place's cover at any size: the same picture on its card, in the grid and on its page, so it
 * looks the same before and after you tap it (lib/photos → frontFor). The parent sets the box.
 */
export function Cover({ spot, sizes, widths = [330, 640], eager, alt, small }: { spot: Spot; sizes: string; widths?: number[]; eager?: boolean; alt?: string; small?: boolean }) {
  const { covers, google } = useMedia();
  const f = frontFor(spot, covers[spot.id], google?.photos[spot.id]);
  if (f.kind === "sketch") return <Matchbook spot={spot} small={small} />;
  return (
    <Photo
      src={f.src(widths[0])}
      srcSet={f.srcSet?.(widths)}
      sizes={f.srcSet ? sizes : undefined}
      alt={alt ?? f.alt}
      genre={spot.genres[0]}
      eager={eager}
      fallback={<Matchbook spot={spot} small={small} />}
    />
  );
}

/** a poster: the cover in a 4:5 frame, with a corner for marks (been, saved, sponsored) */
export function Poster({ spot, sizes = "(max-width: 640px) 46vw, 220px", eager, children }: { spot: Spot; sizes?: string; eager?: boolean; children?: React.ReactNode }) {
  return (
    <span className="poster">
      <Cover spot={spot} sizes={sizes} eager={eager} />
      {children}
    </span>
  );
}
