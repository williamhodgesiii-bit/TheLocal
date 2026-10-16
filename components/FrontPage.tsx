"use client";

import { memo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { areaLabelOf, priceLabel, type Spot } from "@/lib/data";
import { commonsSrc, commonsSrcSet, coverFor } from "@/lib/photos";
import { honorsOf } from "@/lib/honors";
import { milestoneName, nextMilestone, weeklyStreak } from "@/lib/passport";
import { useApp, type Verdict } from "./Providers";
import Photo from "./Photo";

/* The front page: what's on this week, your passport, and ways in by occasion. */

const cover = (s: Spot) => {
  const c = coverFor(s);
  return { src: commonsSrc(c.file, 500), srcSet: commonsSrcSet(c.file, [330, 500, 960]), alt: c.alt };
};

/** A photo card: the dish or the place, the name, what to order. */
export function PlaceCard({ spot, onOpen, onHover, sizes = "(max-width: 900px) 62vw, 200px" }: { spot: Spot; onOpen: (id: string) => void; onHover?: (id: string | null) => void; sizes?: string }) {
  const { been, saved } = useApp();
  const c = cover(spot);
  return (
    <button className="pcard" onClick={() => onOpen(spot.id)} onMouseEnter={() => onHover?.(spot.id)} onMouseLeave={() => onHover?.(null)}>
      <span className="pcard-img">
        <Photo src={c.src} srcSet={c.srcSet} sizes={sizes} alt={c.alt} genre={spot.genres[0]} />
        {been[spot.id] && <span className="stamp stamp-sm">Been</span>}
        {!been[spot.id] && saved.includes(spot.id) && <span className="pcard-heart" aria-label="On your want-to-try list" />}
      </span>
      <span className="pcard-name">{spot.name}</span>
      <span className="pcard-known">{spot.knownFor}</span>
      <span className="pcard-meta">
        {areaLabelOf(spot)} · {priceLabel(spot.price)}
      </span>
    </button>
  );
}

const VERDICTS: [Verdict, string][] = [
  ["loved", "Loved it"],
  ["liked", "It was good"],
  ["meh", "Not for me"],
];

/**
 * Want to try / I've been. Stamping a place adds it to your Plate Passport; then three honest
 * choices for how it went (no stars to agonize over).
 */
export function BeenButtons({ spot, onStamped }: { spot: Spot; onStamped?: () => void }) {
  const { saved, toggleSaved, been, markBeen, toast } = useApp();
  const stamp = been[spot.id];
  const want = saved.includes(spot.id);
  const count = Object.keys(been).length;
  return (
    <div className="been">
      <div className="been-row">
        <button type="button" className={`been-btn ${want ? "on" : ""}`} aria-pressed={want} onClick={() => toggleSaved(spot.id)}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill={want ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          Want to try
        </button>
        <button
          type="button"
          className={`been-btn been-stamp ${stamp ? "on" : ""}`}
          aria-pressed={!!stamp}
          onClick={() => {
            if (stamp) return;
            markBeen(spot.id);
            toast(count === 0 ? "First stamp in your Plate Passport" : `Stamped. ${count + 1} local plates so far`, "ok");
            onStamped?.();
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {stamp ? "Been here" : "I've been"}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {stamp && (
          <motion.div className="verdict" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <span className="verdict-q">How was it?</span>
            <span className="verdict-opts">
              {VERDICTS.map(([v, l]) => (
                <button key={v} type="button" className={`b-chip b-chip-sm ${stamp.verdict === v ? "on" : ""}`} aria-pressed={stamp.verdict === v} onClick={() => markBeen(spot.id, v)}>
                  {l}
                </button>
              ))}
            </span>
            <button type="button" className="textbtn verdict-undo" onClick={() => markBeen(spot.id, null)}>
              Take the stamp back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Awards, small and sourced. */
export function Honors({ id, max = 3 }: { id: string; max?: number }) {
  const list = honorsOf(id).slice(0, max);
  if (!list.length) return null;
  return (
    <ul className="honors">
      {list.map((h) => (
        <li key={h.label + h.year} className={`honor honor-${h.kind}`}>
          <a href={h.source} target="_blank" rel="noreferrer" title={h.who ? `${h.label}, ${h.who}, ${h.year}` : `${h.label}, ${h.year}`}>
            {h.label} {h.year}
            {h.who ? ` · ${h.who}` : ""}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** This week's plate: one place, big, new every Thursday. */
export const WeekPlate = memo(function WeekPlate({ spot, since, onOpen }: { spot: Spot; since: Date; onOpen: (id: string) => void }) {
  const c = cover(spot);
  return (
    <article className="week">
      <button className="week-img" onClick={() => onOpen(spot.id)} aria-label={`This week's plate: ${spot.name}`}>
        <Photo src={c.src} srcSet={c.srcSet} sizes="(max-width: 900px) 100vw, 420px" alt={c.alt} genre={spot.genres[0]} eager />
        <span className="week-kicker">This week&apos;s plate</span>
      </button>
      <div className="week-body">
        <p className="week-date">New every Thursday · picked {since.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
        <h2 className="week-name">
          <button onClick={() => onOpen(spot.id)}>{spot.name}</button>
        </h2>
        <p className="week-meta">
          {areaLabelOf(spot)} · {priceLabel(spot.price)}
        </p>
        <Honors id={spot.id} max={1} />
        <p className="week-order">
          <span className="cl">Order</span> <span className="pen">{spot.knownFor}</span>
        </p>
        <p className="week-why">{spot.blurb}</p>
        <BeenButtons spot={spot} />
      </div>
    </article>
  );
});

/** Your Plate Passport on the front page: how far you've gotten, and the nudge to keep going. */
export function PassportCard({ total, count, onStampMany, onOpen }: { total: number; count: number; onStampMany: () => void; onOpen: () => void }) {
  const { been } = useApp();
  const { next, left } = nextMilestone(count, total);
  const streak = weeklyStreak(been);
  const pct = total ? Math.min(1, count / total) : 0;
  return (
    <section className="pp-card" aria-label="Your Plate Passport">
      <button className="pp-ring" onClick={onOpen} style={{ ["--p" as string]: pct }} aria-label={`${count} of ${total} plates. Open your passport`}>
        <span>{count}</span>
      </button>
      <div className="pp-text">
        <h2>Your Plate Passport</h2>
        {count === 0 ? (
          <p>Stamp the local places you eat at and watch your map fill in. Most people have been to a few already.</p>
        ) : (
          <p>
            <strong>
              {count} of {total}
            </strong>{" "}
            local plates. {left > 0 ? `${left} more to "${milestoneName(next, total)}".` : "Every single one. Legend."}
            {streak.weeks > 1 ? ` ${streak.weeks} weeks in a row.` : ""}
          </p>
        )}
        <p className="pp-actions">
          <button className="btn btn-red btn-sm" onClick={onStampMany}>
            {count === 0 ? "Stamp places you've been" : "Stamp more"}
          </button>
          {count > 0 && (
            <button className="textbtn" onClick={onOpen}>
              Open passport
            </button>
          )}
        </p>
      </div>
    </section>
  );
}

/** A row of places for one occasion: best first, swipe for more, "See all" to filter the list and map. */
export const CollectionRow = memo(function CollectionRow({
  id,
  title,
  line,
  spots,
  now,
  onOpen,
  onHover,
  onSeeAll,
}: {
  id: string;
  title: string;
  line: string;
  spots: Spot[];
  now?: boolean;
  onOpen: (id: string) => void;
  onHover?: (id: string | null) => void;
  onSeeAll: (id: string) => void;
}) {
  return (
    <section className="crow">
      <div className="crow-head">
        <h2>
          {title}
          {now && <span className="crow-now">Good right now</span>}
        </h2>
        <button className="textbtn" onClick={() => onSeeAll(id)}>
          See all {spots.length}
        </button>
      </div>
      <p className="crow-line">{line}</p>
      <div className="crow-cards">
        {spots.slice(0, 8).map((s) => (
          <PlaceCard key={s.id} spot={s} onOpen={onOpen} onHover={onHover} />
        ))}
      </div>
    </section>
  );
});

/** A trail on the front page: a few places with a theme, and how many you've done. */
export const TrailCard = memo(function TrailCard({
  id,
  title,
  line,
  spots,
  have,
  goal,
  daysLeft,
  onSee,
}: {
  id: string;
  title: string;
  line: string;
  spots: Spot[];
  have: number;
  goal: number;
  daysLeft: number | null;
  onSee: (id: string) => void;
}) {
  const { been } = useApp();
  const [peek] = useState(() => spots.slice(0, 6));
  return (
    <button className="trail" onClick={() => onSee(id)}>
      <span className="trail-top">
        <span className="trail-kicker">Trail{daysLeft !== null ? ` · ${daysLeft} days left` : ""}</span>
        <span className="trail-count">
          {have} of {goal}
        </span>
      </span>
      <span className="trail-title">{title}</span>
      <span className="trail-line">{line}</span>
      <span className="trail-dots" aria-hidden>
        {peek.map((s) => (
          <span key={s.id} className={`trail-dot ${been[s.id] ? "on" : ""}`}>
            <Photo src={commonsSrc(coverFor(s).file, 330)} sizes="40px" alt="" genre={s.genres[0]} />
          </span>
        ))}
      </span>
    </button>
  );
});
