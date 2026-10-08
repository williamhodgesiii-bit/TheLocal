"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@vercel/analytics";
import { GENRE_BY_ID, areaLabelOf, priceLabel, type Spot } from "@/lib/data";

function weightedPick(pool: Spot[], avoid?: string) {
  const list = pool.length > 1 && avoid ? pool.filter((s) => s.id !== avoid) : pool;
  // well-loved places come up more often; paid listings get a small, labeled bump
  const weights = list.map((s) => Math.pow(s.pop / 100, 3) * (s.sponsored ? 1.5 : 1));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

/** "Surprise me": the kitchen printer spits out a ticket with somewhere to go. */
export default function Surprise({
  open,
  onClose,
  all,
  filtered,
  onGo,
}: {
  open: boolean;
  onClose: () => void;
  all: Spot[];
  filtered: Spot[];
  onGo: (id: string) => void;
}) {
  const [scoped, setScoped] = useState(false);
  const [ticket, setTicket] = useState(0);
  const [pick, setPick] = useState<Spot | null>(null);
  const [printed, setPrinted] = useState(false);
  const pool = scoped && filtered.length ? filtered : all;

  function print() {
    setPrinted(false);
    setPick((w) => weightedPick(pool, w?.id));
    setTicket((n) => n + 1);
    track("surprise_spin", { scoped });
  }

  useEffect(() => {
    if (open) print();
    else setPick(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && pick && printed) onGo(pick.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="printer"
            role="dialog"
            aria-modal="true"
            aria-label="Surprise me"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="printer-slot">
              <span>Order up</span>
              <button className="printer-x" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            <div className="ticket-well">
              <AnimatePresence mode="wait">
                {pick && (
                  <motion.div
                    key={ticket}
                    className="ticket"
                    initial={{ y: "-100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "120%", rotate: 4, opacity: 0, transition: { duration: 0.25 } }}
                    transition={{ duration: 1.1, ease: [0.3, 0.1, 0.3, 1] }}
                    onAnimationComplete={() => setPrinted(true)}
                    aria-live="polite"
                  >
                    <div className="t-row t-head">
                      <span>Ticket {String(100 + ((ticket * 37) % 900))}</span>
                      <span>{time}</span>
                    </div>
                    <div className="t-rule" />
                    <p className="t-label">Go to</p>
                    <p className="t-name">{pick.name}</p>
                    <p className="t-line">{pick.address}</p>
                    <p className="t-line">
                      {areaLabelOf(pick)} · {priceLabel(pick.price)}
                    </p>
                    <div className="t-rule" />
                    <p className="t-label">Get</p>
                    <p className="t-order">{pick.knownFor}</p>
                    <div className="t-rule" />
                    <div className="t-row">
                      <span>{pick.genres.map((g) => GENRE_BY_ID[g].short).join(", ")}</span>
                      <span>thank you</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="printer-foot">
              <label className="check">
                <input type="checkbox" checked={scoped} onChange={(e) => setScoped(e.target.checked)} />
                Only from what I&apos;ve picked{scoped && filtered.length > 0 ? ` (${filtered.length})` : ""}
              </label>
              <div className="row gap8">
                <button className="btn btn-line" onClick={print}>
                  Another
                </button>
                <button className="btn btn-red" disabled={!printed || !pick} onClick={() => pick && onGo(pick.id)}>
                  Show me
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
