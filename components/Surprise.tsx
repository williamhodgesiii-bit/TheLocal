"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dices, MapPin, X } from "lucide-react";
import { track } from "@vercel/analytics";
import { AREA_BY_ID, GENRE_BY_ID, priceLabel, type Spot } from "@/lib/data";
import Storefront from "./Storefront";

const ITEM_H = 64;
const REEL_LEN = 28;

function weightedPick(pool: Spot[], avoid?: string) {
  const list = pool.length > 1 && avoid ? pool.filter((s) => s.id !== avoid) : pool;
  // popular spots come up more often; sponsored partners get a modest, labeled boost
  const weights = list.map((s) => Math.pow(s.pop / 100, 3) * (s.sponsored ? 1.5 : 1));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

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
  const [spin, setSpin] = useState(0);
  const [winner, setWinner] = useState<Spot | null>(null);
  const [landed, setLanded] = useState(false);
  const pool = scoped && filtered.length ? filtered : all;

  const reel = useMemo(() => {
    if (!winner) return [];
    const names = Array.from({ length: REEL_LEN - 1 }, () => pool[Math.floor(Math.random() * pool.length)]);
    return [...names, winner];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, spin]);

  function go() {
    setLanded(false);
    setWinner((w) => weightedPick(pool, w?.id));
    setSpin((n) => n + 1);
    track("surprise_spin", { scoped });
  }

  useEffect(() => {
    if (open) go();
    else setWinner(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " || e.key.toLowerCase() === "r") {
        e.preventDefault();
        go();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const g = winner ? GENRE_BY_ID[winner.genres[0]] : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="modal surprise"
            role="dialog"
            aria-modal="true"
            aria-label="Surprise me"
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="icon-btn modal-x" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
            <div className="stamp">Can&apos;t decide?</div>
            <h2 className="display">
              Let the <em>Magic City</em> pick.
            </h2>

            <div className="reel-window" aria-live="polite">
              <div className="reel-shade" />
              {winner && (
                <motion.div
                  key={spin}
                  className="reel"
                  initial={{ y: 0 }}
                  animate={{ y: -(REEL_LEN - 1) * ITEM_H }}
                  transition={{ duration: 2.4, ease: [0.12, 0.75, 0.15, 1] }}
                  onAnimationComplete={() => setLanded(true)}
                >
                  {reel.map((s, i) => (
                    <div className="reel-item" key={i} style={{ height: ITEM_H }}>
                      {s.name}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {winner && landed && g && (
                <motion.div
                  key={winner.id}
                  className="surprise-card"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{ ["--c" as string]: g.color }}
                >
                  <div className="surprise-art">
                    <Storefront spot={winner} mini />
                  </div>
                  <div>
                    <div className="meta">
                      {g.short} · {AREA_BY_ID[winner.area].label} · {priceLabel(winner.price)}
                    </div>
                    <p className="known">Known for: {winner.knownFor}</p>
                    <p className="muted small">{winner.blurb}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="surprise-actions">
              <label className="toggle">
                <input type="checkbox" checked={scoped} onChange={(e) => setScoped(e.target.checked)} />
                <span className="toggle-ui" />
                Stick to my filters {scoped && filtered.length > 0 && <span className="mono-sm">({filtered.length})</span>}
              </label>
              <div className="row gap8">
                <button className="btn btn-ghost" onClick={go}>
                  <Dices size={16} /> Spin again
                </button>
                <button className="btn btn-rust" disabled={!landed || !winner} onClick={() => winner && onGo(winner.id)}>
                  <MapPin size={16} /> Take me there
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
