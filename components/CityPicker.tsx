"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ANY_CITY, CITIES, OPEN_CITIES, STATES, apState, cityLabel, homeLabel, isOpenCity, nearestCity, stateName, type City } from "@/lib/regions";
import { useApp } from "./Providers";

/** how close counts as "in" a city when we look you up */
const NEAR_KM = 80;
const miles = (km: number) => Math.round(km * 0.621);

/**
 * The bar at the top of the list: which city you're looking at, and a way back home.
 * Home is where the map opens every visit; this is just where you are tonight.
 */
export function WhereBar({ city, onOpen, onGoHome }: { city: City; onOpen: () => void; onGoHome: (c: City) => void }) {
  const { home } = useApp();
  const homeCity = home && isOpenCity(home) ? ANY_CITY[home] : null;
  return (
    <div className="wherebar">
      <button type="button" className="wb-btn" onClick={onOpen} aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
          <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="9.8" r="2.3" fill="currentColor" />
        </svg>
        <span className="wb-q">Where are you?</span>
        <span className="wb-city">{cityLabel(city)}</span>
        <svg className="wb-chev" viewBox="0 0 24 24" width="14" height="14" aria-hidden>
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {home === city.id ? (
        <span className="wb-home">
          <HouseIcon /> Home
        </span>
      ) : homeCity ? (
        <button type="button" className="textbtn wb-back" onClick={() => onGoHome(homeCity)}>
          <HouseIcon /> Back to {homeCity.name}
        </button>
      ) : null}
    </div>
  );
}

const HouseIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
    <path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
  </svg>
);

type Located = { kind: "busy" } | { kind: "error"; text: string } | { kind: "far"; text: string };

/**
 * "Where are you?" Pick a city to see its food and reviews, or let us look you up.
 * Cities we haven't opened yet are listed too, with a way to hear when they do.
 */
export default function CityPicker({ open, city, onPick, onClose }: { open: boolean; city: City; onPick: (c: City) => void; onClose: () => void }) {
  const { home, setHome, toast } = useApp();
  const [q, setQ] = useState("");
  const [notify, setNotify] = useState<string | null>(null);
  const [elsewhere, setElsewhere] = useState(false);
  const [located, setLocated] = useState<Located | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setNotify(null);
    setElsewhere(false);
    setLocated(null);
    const t = setTimeout(() => document.querySelector<HTMLElement>(".city-picker .where-row.on, .city-picker .where-row")?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);

  const { live, soon } = useMemo(() => {
    const t = q.trim().toLowerCase();
    const match = (c: City) => !t || `${c.name} ${stateName(c.state)} ${c.state}`.toLowerCase().includes(t);
    // home first, then where you are, then the rest as listed
    const rank = (c: City) => (c.id === home ? 0 : c.id === city.id ? 1 : 2);
    return {
      live: OPEN_CITIES.filter(match).sort((a, b) => rank(a) - rank(b)),
      soon: CITIES.filter((c) => c.status === "later" && match(c)),
    };
  }, [q, home, city.id]);

  function locate() {
    if (!("geolocation" in navigator)) return setLocated({ kind: "error", text: "This browser can't share your location. Pick a city from the list." });
    setLocated({ kind: "busy" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const onMap = nearestCity(p, OPEN_CITIES);
        if (onMap && onMap.km <= NEAR_KM) {
          setLocated(null);
          return onPick(onMap.city);
        }
        const coming = nearestCity(p, CITIES.filter((c) => c.status === "later"));
        if (coming && coming.km <= NEAR_KM) {
          setNotify(coming.city.id);
          setLocated({ kind: "far", text: `Looks like you're near ${coming.city.name}. It isn't on the map yet.` });
        } else {
          setElsewhere(true);
          setLocated({
            kind: "far",
            text: onMap ? `We're not in your area yet. The closest city on the map is ${onMap.city.name}, about ${miles(onMap.km)} miles away.` : "We're not in your area yet.",
          });
        }
      },
      () => setLocated({ kind: "error", text: "Couldn't get your location. Pick a city from the list." }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }

  const homeName = homeLabel(home);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="modal where city-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="city-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="sheet-head">
              <h2 className="modal-title" id="city-title">
                Where are you?
              </h2>
              <button className="modal-x" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            <div className="sheet-body">
              <p className="muted">
                {homeName
                  ? `Pick a city to see its food and reviews. Home stays ${homeName}, so the map still opens there next time.`
                  : "Pick a city to see its food and reviews."}
              </p>
              <button type="button" className="btn btn-line cp-locate" onClick={locate} disabled={located?.kind === "busy"}>
                <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
                  <circle cx="12" cy="12" r="3.2" fill="currentColor" />
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.7" />
                </svg>
                {located?.kind === "busy" ? "Finding you…" : "Use my location"}
              </button>
              {located && located.kind !== "busy" && (
                <p className="cp-located" role="status">
                  {located.text}
                </p>
              )}

              {CITIES.length > 8 && (
                <label className="b-search sp-search">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <span className="sr-only">Find a city</span>
                  <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a city" />
                </label>
              )}

              {live.length > 0 && (
                <section className="sp-group">
                  <h3>On the map</h3>
                  <ul className="where-list">
                    {live.map((c) => (
                      <li key={c.id}>
                        <button type="button" className={`where-row ${c.id === city.id ? "on" : ""}`} aria-pressed={c.id === city.id} onClick={() => onPick(c)}>
                          <span className="where-dot" aria-hidden />
                          <span className="where-name">{cityLabel(c)}</span>
                          <span className="where-n">{c.id === home ? "Home" : c.id === city.id ? "You're here" : c.status === "founding" ? "New" : ""}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {soon.length > 0 && (
                <section className="sp-group">
                  <h3>Coming soon</h3>
                  <ul className="where-list">
                    {soon.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={`where-row soon ${notify === c.id ? "on" : ""}`}
                          aria-expanded={notify === c.id}
                          onClick={() => setNotify((cur) => (cur === c.id ? null : c.id))}
                        >
                          <span className="where-dot" aria-hidden />
                          <span className="where-name">{cityLabel(c)}</span>
                          <span className="where-n">{c.id === home ? "Home · soon" : "Soon"}</span>
                        </button>
                        {notify === c.id && <Notify state={c.state} town={c.name} lead={`We're not in ${c.name} yet. Want one email when it opens?`} />}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {!live.length && !soon.length && <p className="p-empty">No city by that name yet.</p>}

              {elsewhere ? (
                <Elsewhere defaultState={city.state} />
              ) : (
                <button type="button" className="textbtn cp-else" onClick={() => setElsewhere(true)}>
                  Somewhere else?
                </button>
              )}
            </div>
            <div className="sheet-foot">
              {home !== city.id ? (
                <button
                  type="button"
                  className="textbtn"
                  onClick={() => {
                    setHome(city.id);
                    toast(`Home is ${city.name} now. The map opens here every visit.`, "ok");
                  }}
                >
                  Make {city.name} home
                </button>
              ) : (
                <span className="cp-home-now">{city.name} is home</span>
              )}
              <button type="button" className="btn btn-green" onClick={onClose}>
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** one email when a city opens */
function Notify({ state, town, label, lead }: { state: string; town: string; label?: string; lead: string }) {
  const { backend, user, toast } = useApp();
  const [email, setEmail] = useState(user?.email ?? "");
  const [done, setDone] = useState(false);
  if (done) return <p className="where-done">You&apos;re on the list for {label ?? town}. We&apos;ll email you once when it opens.</p>;
  return (
    <form
      className="form where-wait"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await backend.waitlist(email.trim(), state, town);
          setDone(true);
        } catch {
          toast("That didn't go through. Try again?", "err");
        }
      }}
    >
      <p>{lead}</p>
      <div className="cp-notify">
        <label>
          <span className="sr-only">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>
        <button className="btn btn-green">Tell me</button>
      </div>
    </form>
  );
}

/** a town we don't have on the list at all: we open a place once enough neighbors ask */
function Elsewhere({ defaultState }: { defaultState: string }) {
  const [state, setState] = useState(defaultState);
  const [town, setTown] = useState("");
  return (
    <div className="form cp-elsewhere">
      <div className="form-grid">
        <label>
          <span>Town</span>
          <input value={town} onChange={(e) => setTown(e.target.value)} placeholder="Town" maxLength={60} />
        </label>
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
      </div>
      <Notify
        state={state}
        town={town.trim()}
        label={town.trim() ? `${town.trim()}, ${apState(state)}` : stateName(state)}
        lead="We open a city once enough neighbors ask. Leave your email and you'll hear once, when yours opens."
      />
    </div>
  );
}
