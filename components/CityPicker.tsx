"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MapPin, Sparkles, X } from "lucide-react";
import { CITIES, STATES, citiesIn, stateName, type City } from "@/lib/regions";
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
            <button className="icon-btn modal-x" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
            <div className="stamp">{firstRun ? "Welcome" : "Change city"}</div>
            <h2 className="display">
              Where&apos;s <em>home?</em>
            </h2>
            <p className="muted">We&apos;ll show you the independent spots locals love — and you can add the ones we&apos;re missing.</p>

            <label className="form state-select">
              <span>Home state</span>
              <select value={state} onChange={(e) => setState(e.target.value)}>
                {STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                    {openStates.has(s.code) ? "" : " — coming soon"}
                  </option>
                ))}
              </select>
            </label>

            {cities.length > 0 ? (
              <div className="city-grid">
                {cities.map((c, i) => (
                  <motion.button
                    key={c.id}
                    className={`city-card ${c.status} ${c.id === current.id ? "on" : ""}`}
                    onClick={() => onPick(c)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.025 } }}
                  >
                    <span className="city-name">{c.name}</span>
                    <span className="city-nick">{c.nickname}</span>
                    <span className={`city-status ${c.status}`}>
                      {c.status === "live" ? (
                        <>
                          <MapPin size={11} /> {liveCounts[c.id] ?? 0}+ spots
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} /> {liveCounts[c.id] ? `${liveCounts[c.id]} spots · ` : ""}Founding members wanted
                        </>
                      )}
                    </span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="waitlist">
                {joined ? (
                  <p className="display small-display">You&apos;re on the {stateName(state)} list. We&apos;ll email you the day it opens.</p>
                ) : (
                  <form
                    className="form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await backend.waitlist(email.trim(), state, wantCity.trim());
                        setJoined(true);
                      } catch {
                        toast("Couldn't join — try again", "err");
                      }
                    }}
                  >
                    <p>
                      <strong>{stateName(state)} isn&apos;t open yet.</strong> We open new states when enough locals ask — get on the list and you&apos;ll be a founding member.
                    </p>
                    <div className="form-grid">
                      <label>
                        <span>Your city</span>
                        <input value={wantCity} onChange={(e) => setWantCity(e.target.value)} placeholder="e.g. Nashville" maxLength={60} />
                      </label>
                      <label>
                        <span>Email</span>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                      </label>
                    </div>
                    <button className="btn btn-rust">Notify me</button>
                  </form>
                )}
                <button className="link-btn" onClick={() => onPick(CITIES[0])}>
                  Browse {CITIES[0].name} in the meantime <ArrowRight size={13} />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
