"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TOWNS, type TownId } from "@/lib/data";
import { STATES, apState, citiesIn, plannedIn, stateName, type City } from "@/lib/regions";
import { useApp } from "./Providers";

/**
 * "Where do you eat most?" First-visit onboarding and the town switcher.
 * Today: the Birmingham area, by town. Other cities and states join a waitlist;
 * opening one is a status change in lib/regions.ts.
 */
export default function CityPicker({
  open,
  current,
  currentTown,
  firstRun,
  townCounts,
  onPick,
  onClose,
}: {
  open: boolean;
  current: City;
  currentTown: TownId | null;
  firstRun: boolean;
  townCounts: Record<string, number>;
  onPick: (c: City, town: TownId | null) => void;
  onClose: () => void;
}) {
  const { backend, toast } = useApp();
  const [state, setState] = useState(current.state);
  const [email, setEmail] = useState("");
  const [wantCity, setWantCity] = useState("");
  const [joined, setJoined] = useState(false);
  const [askOther, setAskOther] = useState(false);

  useEffect(() => {
    if (open) {
      setState(current.state);
      setJoined(false);
      setAskOther(false);
    }
  }, [open, current.state]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const cities = citiesIn(state);
  const planned = plannedIn(state);
  const metro = cities[0];
  const showWaitlist = !metro || askOther;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="modal city-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Where do you eat most?"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="modal-x" onClick={onClose} aria-label="Close">
              ×
            </button>
            <h2 className="modal-title">{firstRun ? "Where do you eat most?" : "Pick a part of town"}</h2>
            <p className="muted">We&apos;ll start the map there. You can switch any time.</p>

            <label className="form state-select">
              <span>State</span>
              <select value={state} onChange={(e) => setState(e.target.value)}>
                {STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                    {citiesIn(s.code).length ? "" : " (not yet)"}
                  </option>
                ))}
              </select>
            </label>

            {metro && (
              <>
                <p className="dir-group">{metro.name} area</p>
                <ul className="directory">
                  {TOWNS.map((t) => (
                    <li key={t.id}>
                      <button className={currentTown === t.id ? "on" : ""} onClick={() => onPick(metro, t.id)}>
                        <span className="dir-name">
                          {t.label}, {apState(metro.state)}
                        </span>
                        <span className="leader" aria-hidden />
                        <span className="dir-status live">{townCounts[t.id] ?? 0} places</span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button className={currentTown === null && !firstRun ? "on" : ""} onClick={() => onPick(metro, null)}>
                      <span className="dir-name">All of it</span>
                      <span className="leader" aria-hidden />
                      <span className="dir-status">{townCounts.all ?? 0} places</span>
                    </button>
                  </li>
                </ul>
                {!askOther && (
                  <p className="fine">
                    {planned.length ? `${planned.slice(0, 3).map((c) => c.name).join(", ")} and more are next. ` : ""}
                    <button className="textbtn" onClick={() => setAskOther(true)}>
                      Live somewhere else?
                    </button>
                  </p>
                )}
              </>
            )}

            {showWaitlist && (
              <div className="waitlist">
                {joined ? (
                  <p>We&apos;ve got you down. We&apos;ll email when your town opens.</p>
                ) : (
                  <form
                    className="form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await backend.waitlist(email.trim(), state, wantCity.trim());
                        setJoined(true);
                      } catch {
                        toast("That didn't go through. Try again?", "err");
                      }
                    }}
                  >
                    <p>
                      <strong>{metro ? "Tell us where you are." : `We're not in ${stateName(state)} yet.`}</strong> We open a town once enough people there ask.
                    </p>
                    <div className="form-grid">
                      <label>
                        <span>Your town</span>
                        <input value={wantCity} onChange={(e) => setWantCity(e.target.value)} placeholder="Town" maxLength={60} />
                      </label>
                      <label>
                        <span>Email</span>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                      </label>
                    </div>
                    <button className="btn btn-green">Let me know</button>
                  </form>
                )}
                {!metro && (
                  <button className="textbtn" onClick={() => setState("AL")}>
                    Look around Birmingham for now →
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
