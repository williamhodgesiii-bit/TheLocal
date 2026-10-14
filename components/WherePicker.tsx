"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TOWNS, TOWN_BY_ID, type Area } from "@/lib/data";
import { DEFAULT_CITY, STATES, citiesIn, plannedIn, stateName, type City } from "@/lib/regions";
import { useApp } from "./Providers";

/**
 * Where are you eating? One list: anywhere, a town, then (once a town is picked) its
 * neighborhoods. The list behind updates as you tap; the button says how many match.
 * It's also the first-visit question ("Where do you eat most?").
 */
export default function WherePicker({
  open,
  firstRun,
  city,
  area,
  areas,
  counts,
  total,
  onArea,
  onDone,
}: {
  open: boolean;
  firstRun: boolean;
  city: City;
  /** "all", a town ("t:homewood") or a neighborhood id */
  area: string;
  areas: Area[];
  /** matches for each choice with the current food, price and search */
  counts: Record<string, number>;
  total: number;
  onArea: (a: string) => void;
  onDone: () => void;
}) {
  const [elsewhere, setElsewhere] = useState(false);

  useEffect(() => {
    if (!open) return;
    setElsewhere(false);
    // keyboard: start on the current choice
    const t = setTimeout(() => document.querySelector<HTMLElement>(".where .where-row.on, .where .where-row")?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDone]);

  const towns = city.id === DEFAULT_CITY ? TOWNS : [];
  const byId = Object.fromEntries(areas.map((a) => [a.id, a]));
  const activeTown = area.startsWith("t:") ? area.slice(2) : (byId[area]?.town ?? null);
  // community cities have neighborhoods but no towns
  const loose = towns.length ? [] : areas;
  const blurb = byId[area]?.blurb || (activeTown && TOWN_BY_ID[activeTown as keyof typeof TOWN_BY_ID]?.blurb) || "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onDone}>
          <motion.div
            className="modal where"
            role="dialog"
            aria-modal="true"
            aria-labelledby="where-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="sheet-head">
              <h2 className="modal-title" id="where-title">
                {firstRun ? "Where do you eat most?" : "Where are you eating?"}
              </h2>
              <button className="modal-x" onClick={onDone} aria-label="Close">
                ×
              </button>
            </div>
            <div className="sheet-body">
              <p className="muted">{firstRun ? "We'll start the map there. You can change it any time." : "Pick a town. Then a neighborhood, if you like."}</p>
              <ul className="where-list">
                <li>
                  <WhereRow label={`Anywhere around ${city.name}`} n={counts.all ?? 0} on={area === "all"} onClick={() => onArea("all")} />
                </li>
                {towns.map((t) => {
                  const here = activeTown === t.id;
                  const hoods = areas.filter((a) => a.town === t.id);
                  return (
                    <li key={t.id}>
                      <WhereRow label={t.label} n={counts[`t:${t.id}`] ?? 0} on={here} expanded={here} onClick={() => onArea(`t:${t.id}`)} />
                      {here && hoods.length > 0 && (
                        <div className="where-hoods" role="group" aria-label={`Neighborhoods in ${t.label}`}>
                          <button type="button" className={`b-chip b-chip-sm ${area === `t:${t.id}` ? "on" : ""}`} aria-pressed={area === `t:${t.id}`} onClick={() => onArea(`t:${t.id}`)}>
                            All of {t.label}
                          </button>
                          {hoods.map((h) => (
                            <button
                              key={h.id}
                              type="button"
                              className={`b-chip b-chip-sm ${area === h.id ? "on" : ""} ${(counts[h.id] ?? 0) === 0 ? "zero" : ""}`}
                              aria-pressed={area === h.id}
                              onClick={() => onArea(h.id)}
                            >
                              {h.label} <span className="b-n">{counts[h.id] ?? 0}</span>
                            </button>
                          ))}
                          {blurb && <p className="where-blurb">{blurb}</p>}
                        </div>
                      )}
                    </li>
                  );
                })}
                {loose.map((a) => (
                  <li key={a.id}>
                    <WhereRow label={a.label} n={counts[a.id] ?? 0} on={area === a.id} onClick={() => onArea(a.id)} />
                  </li>
                ))}
              </ul>
              {elsewhere ? <Waitlist city={city} /> : null}
            </div>
            <div className="sheet-foot">
              <button type="button" className="textbtn" onClick={() => setElsewhere((v) => !v)} aria-expanded={elsewhere}>
                {elsewhere ? "Never mind" : `Not near ${city.name}?`}
              </button>
              <button type="button" className="btn btn-green" onClick={onDone}>
                {total === 0 ? "No matches yet" : `Show ${total} ${total === 1 ? "place" : "places"}`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WhereRow({ label, n, on, expanded, onClick }: { label: string; n: number; on: boolean; expanded?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`where-row ${on ? "on" : ""} ${n === 0 ? "zero" : ""}`} aria-pressed={on} aria-expanded={expanded} onClick={onClick}>
      <span className="where-dot" aria-hidden />
      <span className="where-name">{label}</span>
      <span className="where-n">
        {n} {n === 1 ? "place" : "places"}
      </span>
    </button>
  );
}

/** Other towns open once enough people there ask. */
function Waitlist({ city }: { city: City }) {
  const { backend, toast } = useApp();
  const [state, setState] = useState(city.state);
  const [email, setEmail] = useState("");
  const [town, setTown] = useState("");
  const [joined, setJoined] = useState(false);
  const planned = plannedIn(state);
  if (joined) return <p className="where-done">You&apos;re on the list. We&apos;ll email you when your town opens.</p>;
  return (
    <form
      className="form where-wait"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await backend.waitlist(email.trim(), state, town.trim());
          setJoined(true);
        } catch {
          toast("That didn't go through. Try again?", "err");
        }
      }}
    >
      <p>
        <strong>We open a town once enough neighbors ask.</strong>
        {planned.length ? ` Next up: ${planned.slice(0, 3).map((c) => c.name).join(", ")}.` : ""}
        {citiesIn(state).length === 0 ? ` Nothing in ${stateName(state)} yet.` : ""}
      </p>
      <div className="form-grid">
        <label>
          <span>State</span>
          <select value={state} onChange={(e) => setState(e.target.value)}>
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Your town</span>
          <input value={town} onChange={(e) => setTown(e.target.value)} placeholder="Town" maxLength={60} />
        </label>
      </div>
      <label>
        <span>Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </label>
      <button className="btn btn-green">Tell me when it opens</button>
    </form>
  );
}
