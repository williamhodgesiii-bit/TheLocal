"use client";

import { useEffect, useState } from "react";
import { SPOT_BY_ID } from "@/lib/data";
import { Matchbook } from "./Cover";

type Counts = { saves: number | null; stamps: number | null; reviews: number | null; lists: number | null; members?: number | null; places: number };

/**
 * Live numbers for owners: how many people have your place on their want-to-try list, have
 * been, reviewed it, or put it on a list of their own. Counts only, never who.
 */
export default function OwnerSnapshot({ spot }: { spot?: string }) {
  const known = spot ? SPOT_BY_ID[spot] : undefined;
  const [c, setC] = useState<Counts | null>(null);
  useEffect(() => {
    fetch(`/api/snapshot${known ? `?spot=${known.id}` : ""}`)
      .then((r) => r.json())
      .then(setC)
      .catch(() => {});
  }, [known]);
  const live = c && c.saves !== null;
  const rows: [string, number | null | undefined, string][] = known
    ? [
        ["Want to try", c?.saves, "people saved you to go"],
        ["Been", c?.stamps, "stamped their passport here"],
        ["On lists", c?.lists, "of their own lists, like “Date night”"],
        ["Reviews", c?.reviews, "with photos, in friends’ feeds"],
      ]
    : [
        ["Places", c?.places, "locally owned, each checked by a person"],
        ["Members", c?.members, "people who save, stamp and review"],
        ["Saves", c?.saves, "places on someone’s want-to-try list"],
        ["Reviews", c?.reviews, "one per member per place"],
      ];
  return (
    <aside className="snap" aria-label={known ? `${known.name} on The Plate Next Door` : "The Plate Next Door in numbers"}>
      <div className="snap-top">
        {known && (
          <span className="snap-cover">
            <Matchbook spot={known} small />
          </span>
        )}
        <div>
          <p className="eyebrow">{known ? "Your place, right now" : "Right now"}</p>
          <p className="snap-name">{known ? known.name : "Birmingham, on one list"}</p>
        </div>
      </div>
      <dl className="snap-grid">
        {rows.map(([k, v, line]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{live || k === "Places" ? (v ?? "–") : "–"}</dd>
            <p>{line}</p>
          </div>
        ))}
      </dl>
      {!live && c && <p className="snap-note">Live counts show here once the site&apos;s database is connected.</p>}
    </aside>
  );
}
