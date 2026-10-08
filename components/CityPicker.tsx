"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CITIES, STATES, apState, citiesIn, stateName, type City } from "@/lib/regions";
import { useApp } from "./Providers";

/** "Where's home?" — first-visit onboarding and the city switcher. */
export default function CityPicker({
  open,
  current,
  firstRun,
  liveCounts,
  onPick,
  onClose,
}: {
  open: boolean;
  current: City;
  firstRun: boolean;
  liveCounts: Record<string, number>;
  onPick: (c: City) => void;
  onClose: () => void;
}) {
  const { backend, toast } = useApp();
  const [state, setState] = useState(current.state);
  const [email, setEmail] = useState("");
  const [wantCity, setWantCity] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (open) {
      setState(current.state);
      setJoined(false);
    }
  }, [open, current.state]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const cities = citiesIn(state);
  const openStates = new Set(CITIES.map((c) => c.state));

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="modal city-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose your city"
            initial={{ y: 30, opacity: 0, rotate: 1 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="modal-x" onClick={onClose} aria-label="Close">
              ×
            </button>
            <h2 className="modal-title">{firstRun ? "Where do you live?" : "Pick a city"}</h2>
            <p className="muted">So we show you the right map. You can change it any time.</p>

            <label className="form state-select">
              <span>State</span>
              <select value={state} onChange={(e) => setState(e.target.value)}>
                {STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                    {openStates.has(s.code) ? "" : " (not yet)"}
                  </option>
                ))}
              </select>
            </label>

            {cities.length > 0 ? (
              <>
              <ul className="directory">
                {cities.map((c) => (
                  <li key={c.id}>
                    <button className={c.id === current.id ? "on" : ""} onClick={() => onPick(c)}>
                      <span className="dir-name">
                        {c.name}, {apState(c.state)}
                      </span>
                      <span className="leader" aria-hidden />
                      <span className={`dir-status ${c.status}`}>
                        {c.status === "live"
                          ? `${liveCounts[c.id] ?? 0} places`
                          : liveCounts[c.id]
                            ? `${liveCounts[c.id]} so far, add yours`
                            : "just getting started"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="fine">Places outside Birmingham are added by people who live there, and we check each one.</p>
              </>
            ) : (
              <div className="waitlist">
                {joined ? (
                  <p>You&apos;re on the {stateName(state)} list. We&apos;ll email you when it opens.</p>
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
                      <strong>We&apos;re not in {stateName(state)} yet.</strong> We open a state once enough people there ask. Leave your email and we&apos;ll tell you when.
                    </p>
                    <div className="form-grid">
                      <label>
                        <span>Your city</span>
                        <input value={wantCity} onChange={(e) => setWantCity(e.target.value)} placeholder="Your town" maxLength={60} />
                      </label>
                      <label>
                        <span>Email</span>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                      </label>
                    </div>
                    <button className="btn btn-green">Let me know</button>
                  </form>
                )}
                <button className="textbtn" onClick={() => onPick(CITIES[0])}>
                  Look around {CITIES[0].name} for now →
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
