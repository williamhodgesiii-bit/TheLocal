"use client";

import { useMemo, useState } from "react";
import { areaLabelOf, priceLabel, type Area, type Spot } from "@/lib/data";
import { MILESTONES, byNeighborhood, milestoneName, nextMilestone, suggestions, weeklyStreak } from "@/lib/passport";
import { TRAILS, trailProgress } from "@/lib/trails";
import { passportCard, sharePassport } from "@/lib/shareCard";
import { useApp } from "./Providers";
import { Thumb } from "./Photo";

const VERDICT_LABEL = { loved: "Loved it", liked: "It was good", meh: "Not for me" } as const;

/**
 * Your Plate Passport: every local place you've eaten at, stamped. Works without an account
 * (it lives on this device), so nobody has to sign up to start.
 */
export default function Passport({ spots, areas, city, onOpen, onStampMany }: { spots: Spot[]; areas: Area[]; city: string; onOpen: (id: string) => void; onStampMany: () => void }) {
  const { been, saved, toast } = useApp();
  const [list, setList] = useState<"been" | "want">("been");
  const [sharing, setSharing] = useState(false);
  const ids = new Set(spots.map((s) => s.id));
  const stamped = spots.filter((s) => been[s.id]);
  const count = stamped.length;
  const total = spots.length;
  const { next, prev, left } = nextMilestone(count, total);
  const streak = weeklyStreak(been);
  const hoods = useMemo(() => byNeighborhood(spots, areas, been), [spots, areas, been]);
  const trails = TRAILS.map((t) => ({ t, p: trailProgress(t, spots, areas, (id) => !!been[id]) })).filter((x) => x.p.open && x.p.list.length);
  const want = saved.filter((id) => ids.has(id) && !been[id]);
  const next3 = suggestions(spots, been, saved);
  const earned = [...MILESTONES, total].filter((m, i, a) => a.indexOf(m) === i && m <= count);

  async function share() {
    setSharing(true);
    try {
      const blob = await passportCard({ count, total, city, stamped: spots.map((s) => !!been[s.id]) });
      if (!blob) return toast("Couldn't make the picture on this device.", "err");
      const r = await sharePassport(blob, `I've eaten at ${count} of ${total} locally owned plates around ${city}. Skip the chains. Eat next door.`);
      if (r === "saved") toast("Saved the picture. Post it anywhere.", "ok");
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className="passport">
      <div className="pp-top">
        <div className="pp-ring pp-ring-lg" style={{ ["--p" as string]: total ? count / total : 0 }}>
          <span>{count}</span>
        </div>
        <div>
          <p className="cap-kicker">Your Plate Passport</p>
          <h2 className="pp-title">
            {count === 0 ? "No stamps yet" : `${count} of ${total} local plates`}
          </h2>
          <p className="pp-sub">
            {count === 0
              ? "Stamp the places you've eaten at. You've probably been to a few already."
              : left > 0
                ? `${left} more to "${milestoneName(next, total)}".`
                : "You've eaten at every place on the list."}
            {streak.weeks > 1 ? ` ${streak.weeks} weeks in a row eating local.` : ""}
          </p>
          {count > 0 && left > 0 && (
            <span className="pp-bar" aria-hidden>
              <i style={{ width: `${((count - prev) / (next - prev)) * 100}%` }} />
            </span>
          )}
        </div>
      </div>
      <p className="pp-actions">
        <button className="btn btn-red" onClick={onStampMany}>
          {count === 0 ? "Stamp places you've been" : "Stamp more"}
        </button>
        {count > 0 && (
          <button className="btn btn-line" onClick={share} disabled={sharing}>
            {sharing ? "Making it…" : "Share my passport"}
          </button>
        )}
      </p>

      {earned.length > 0 && (
        <ul className="pp-badges" aria-label="Milestones">
          {earned.map((m) => (
            <li key={m} className="pp-badge">
              <b>{m}</b>
              <span>{milestoneName(m, total)}</span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="pp-h">Stamps by neighborhood</h3>
      <ul className="pp-hoods">
        {hoods.map(({ area, total: t, got }) => (
          <li key={area.id} className={`pp-hood ${got === t ? "full" : got ? "some" : ""}`}>
            <span className="pp-hood-stamp" aria-hidden>
              {got}
            </span>
            <span className="pp-hood-name">{area.label}</span>
            <span className="pp-hood-n">
              {got} of {t}
            </span>
          </li>
        ))}
      </ul>

      {trails.length > 0 && (
        <>
          <h3 className="pp-h">Trails</h3>
          <ul className="pp-trails">
            {trails.map(({ t, p }) => (
              <li key={t.id} className={p.finished ? "done" : ""}>
                <span className="pp-trail-name">
                  {t.title}
                  {p.finished ? " · done" : p.daysLeft !== null ? ` · ${p.daysLeft} days left` : ""}
                </span>
                <span className="pp-bar" aria-hidden>
                  <i style={{ width: `${(p.have / p.goal) * 100}%` }} />
                </span>
                <span className="pp-trail-n">
                  {p.have} of {p.goal}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {next3.length > 0 && (
        <>
          <h3 className="pp-h">Stamp these next</h3>
          <Lines spots={next3} onOpen={onOpen} />
        </>
      )}

      <nav className="profile-tabs pp-tabs" aria-label="Your lists">
        <button className={list === "been" ? "on" : ""} aria-pressed={list === "been"} onClick={() => setList("been")}>
          Been <span>{count}</span>
        </button>
        <button className={list === "want" ? "on" : ""} aria-pressed={list === "want"} onClick={() => setList("want")}>
          Want to try <span>{want.length}</span>
        </button>
      </nav>
      {list === "been" ? (
        count ? (
          <Lines spots={[...stamped].sort((a, b) => (been[b.id].at > been[a.id].at ? 1 : -1))} onOpen={onOpen} note={(s) => (been[s.id].verdict ? VERDICT_LABEL[been[s.id].verdict!] : "")} />
        ) : (
          <p className="p-empty">Places you stamp show up here, newest first.</p>
        )
      ) : want.length ? (
        <Lines spots={want.map((id) => spots.find((s) => s.id === id)!).filter(Boolean)} onOpen={onOpen} />
      ) : (
        <p className="p-empty">Tap the heart on any place to save it for later.</p>
      )}
    </section>
  );
}

function Lines({ spots, onOpen, note }: { spots: Spot[]; onOpen: (id: string) => void; note?: (s: Spot) => string }) {
  return (
    <ul className="pp-lines">
      {spots.map((s) => (
        <li key={s.id}>
          <button onClick={() => onOpen(s.id)}>
            <Thumb spot={s} w={48} />
            <span className="pp-line-body">
              <span className="pp-line-name">{s.name}</span>
              <span className="pp-line-meta">
                {areaLabelOf(s)} · {priceLabel(s.price)}
                {note?.(s) ? ` · ${note(s)}` : ""}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
