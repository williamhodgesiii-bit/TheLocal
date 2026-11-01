"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { GENRE_BY_ID, areaLabelOf, priceLabel, type Spot } from "@/lib/data";
import { placesIn } from "@/lib/lists";
import { feel } from "@/lib/native";
import { useApp } from "./Providers";
import { Cover } from "./Cover";
import { Icon } from "./Icons";
import Sheet from "./Sheet";

const FROM_KEY = "tl.spinFrom";

function weightedPick(pool: Spot[], avoid?: string) {
  const list = pool.length > 1 && avoid ? pool.filter((s) => s.id !== avoid) : pool;
  // well-loved places come up a little more often; nobody can pay to come up more
  const weights = list.map((s) => Math.pow(Math.max(5, s.pop) / 100, 2));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

/**
 * Surprise me: pick where to spin from (everywhere, your filters, Want to try, or one of your
 * lists), then the covers flip like a Rolodex and land on somewhere to go.
 */
export default function Surprise({
  open,
  onClose,
  all,
  filtered,
  narrowed,
  from: asked,
  onGo,
  onNewList,
}: {
  open: boolean;
  onClose: () => void;
  all: Spot[];
  filtered: Spot[];
  narrowed: boolean;
  /** open on this source ("saved", "been", "filters" or a list id) */
  from?: string | null;
  onGo: (id: string) => void;
  onNewList: () => void;
}) {
  const { lists, saved, been } = useApp();
  const [from, setFrom] = useState("all");
  const [pick, setPick] = useState<Spot | null>(null);
  const [face, setFace] = useState<Spot | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [flip, setFlip] = useState(0);
  const timer = useRef<number>();

  const sources = useMemo(() => {
    const ctx = { been, saved };
    const out: { id: string; label: string; pool: Spot[] }[] = [{ id: "all", label: "Anywhere", pool: all }];
    if (narrowed && filtered.length) out.push({ id: "filters", label: "My filters", pool: filtered });
    const sv = all.filter((s) => saved.includes(s.id));
    if (sv.length) out.push({ id: "saved", label: "Want to try", pool: sv });
    lists.forEach((l) => out.push({ id: l.id, label: l.title, pool: placesIn(l, all, ctx) }));
    const bn = all.filter((s) => been[s.id]?.verdict === "loved");
    if (bn.length >= 3) out.push({ id: "been", label: "Old favorites", pool: bn });
    return out;
  }, [all, filtered, narrowed, saved, been, lists]);
  const source = sources.find((s) => s.id === from) ?? sources[0];

  const spin = useCallback(
    (pool: Spot[], avoid?: string) => {
      window.clearTimeout(timer.current);
      if (!pool.length) {
        setPick(null);
        setFace(null);
        return;
      }
      const target = weightedPick(pool, avoid);
      setPick(target);
      track("surprise_spin", { from: source.id === "all" || source.id === "filters" || source.id === "saved" || source.id === "been" ? source.id : "list", size: pool.length });
      const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (still || pool.length < 2) {
        setFace(target);
        setSpinning(false);
        return;
      }
      setSpinning(true);
      // the Rolodex: quick flips that slow down, then the pick
      const steps = Math.min(12, 5 + pool.length);
      let i = 0;
      const tick = () => {
        i++;
        if (i >= steps) {
          setFace(target);
          setFlip((n) => n + 1);
          setSpinning(false);
          feel("done");
          return;
        }
        setFace(pool[Math.floor(Math.random() * pool.length)]);
        setFlip((n) => n + 1);
        timer.current = window.setTimeout(tick, 40 + i * i * 1.2);
      };
      tick();
    },
    [source.id]
  );

  // opening: the source asked for, else the one used last, else your filters when you have some
  useEffect(() => {
    if (!open) {
      window.clearTimeout(timer.current);
      setPick(null);
      setFace(null);
      return;
    }
    let last: string | null = null;
    try {
      last = localStorage.getItem(FROM_KEY);
    } catch {
      /* ignore */
    }
    const want = asked ?? (narrowed && filtered.length ? "filters" : last) ?? "all";
    const s = sources.find((x) => x.id === want) ?? sources[0];
    setFrom(s.id);
    spin(s.pool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const choose = (id: string) => {
    setFrom(id);
    try {
      localStorage.setItem(FROM_KEY, id);
    } catch {
      /* ignore */
    }
    const s = sources.find((x) => x.id === id);
    if (s) spin(s.pool);
  };

  const shown = face ?? pick;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Surprise me"
      foot={
        <div className="sz-foot">
          <button type="button" className="btn btn-line" onClick={() => spin(source.pool, pick?.id)} disabled={spinning || source.pool.length < 2}>
            <Icon name="dice" size={18} /> Again
          </button>
          <button type="button" className="btn btn-red" disabled={spinning || !pick} onClick={() => pick && onGo(pick.id)}>
            Let&apos;s go
          </button>
        </div>
      }
    >
      <div className="sz-from" role="group" aria-label="Spin from">
        {sources.map((s) => (
          <button key={s.id} type="button" className={`chip ${from === s.id ? "on" : ""}`} aria-pressed={from === s.id} onClick={() => choose(s.id)} disabled={!s.pool.length}>
            {s.label}
            <span className="n">{s.pool.length}</span>
          </button>
        ))}
        <button type="button" className="chip chip-dash" onClick={onNewList}>
          <Icon name="plus" size={14} /> New list
        </button>
      </div>
      <div className="sz-stage" aria-live="polite" aria-busy={spinning}>
        {shown ? (
          <>
            <div key={flip} className={`sz-card ${spinning ? "spinning" : "landed"}`}>
              <Cover spot={shown} sizes="(max-width: 640px) 60vw, 240px" widths={[500, 800]} eager />
            </div>
            <div className={`sz-info ${spinning ? "dim" : ""}`}>
              <p className="sz-name">{shown.name}</p>
              <p className="sz-meta">
                {GENRE_BY_ID[shown.genres[0]]?.label} · {areaLabelOf(shown)} · {priceLabel(shown.price)}
              </p>
              {!spinning && <p className="sz-order">Get the {shown.knownFor.charAt(0).toLowerCase() + shown.knownFor.slice(1)}.</p>}
            </div>
          </>
        ) : (
          <p className="empty-line">Nothing in &ldquo;{source.label}&rdquo; yet.</p>
        )}
      </div>
    </Sheet>
  );
}
