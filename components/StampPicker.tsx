"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TOWNS, type Area, type Spot } from "@/lib/data";
import { useApp } from "./Providers";
import { Thumb } from "./Photo";

/**
 * "Where have you eaten already?" Tap through the list and stamp every place you've been.
 * Starting people with credit for what they've already done is the single best-supported
 * way to get them to keep going (a punch card that starts with two stamps gets finished
 * far more often than a blank one).
 */
export default function StampPicker({ open, onClose, spots, areas }: { open: boolean; onClose: () => void; spots: Spot[]; areas: Area[] }) {
  const { backend, been, markBeen } = useApp();
  const [q, setQ] = useState("");
  const [start, setStart] = useState(0);
  useEffect(() => {
    if (!open) return;
    setQ("");
    setStart(Object.keys(been).length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const match = (s: Spot) => !t || `${s.name} ${s.knownFor}`.toLowerCase().includes(t);
    const byTown = TOWNS.map((town) => ({
      label: town.label,
      spots: spots.filter((s) => areas.find((a) => a.id === s.area)?.town === town.id && match(s)).sort((a, b) => a.name.localeCompare(b.name)),
    }));
    const loose = spots.filter((s) => !areas.find((a) => a.id === s.area)?.town && match(s));
    return [...byTown, ...(loose.length ? [{ label: "More", spots: loose }] : [])].filter((g) => g.spots.length);
  }, [spots, areas, q]);

  const count = Object.keys(been).length;
  const added = count - start;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="modal where stamp-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stamp-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="sheet-head">
              <h2 className="modal-title" id="stamp-title">
                Where have you eaten already?
              </h2>
              <button className="modal-x" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            <div className="sheet-body">
              <p className="muted">Tap every place you&apos;ve been. Each one is a stamp in your Plate Passport.{" "}
                {backend.mode === "supabase" ? "It's kept in your account, on every device." : "It stays on this device."}
              </p>
              <label className="b-search sp-search">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                  <path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span className="sr-only">Find a place</span>
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a place" />
              </label>
              {groups.map((g) => (
                <section key={g.label} className="sp-group">
                  <h3>{g.label}</h3>
                  <ul>
                    {g.spots.map((s) => {
                      const on = !!been[s.id];
                      return (
                        <li key={s.id}>
                          <button type="button" className={`sp-item ${on ? "on" : ""}`} aria-pressed={on} onClick={() => markBeen(s.id, on ? null : undefined)}>
                            <Thumb spot={s} w={44} />
                            <span className="sp-name">{s.name}</span>
                            <span className="sp-check" aria-hidden>
                              {on ? "✓" : ""}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              {!groups.length && <p className="p-empty">No place by that name yet.</p>}
            </div>
            <div className="sheet-foot">
              <span className="sp-total">
                <strong>{count}</strong> stamped{added > 0 ? ` (+${added})` : ""}
              </span>
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
