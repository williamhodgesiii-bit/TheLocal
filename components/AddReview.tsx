"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GENRE_BY_ID, areaLabelOf, type Spot } from "@/lib/data";
import { useApp } from "./Providers";
import { Icon } from "./Icons";
import { Thumb } from "./Photo";
import Portal from "./Portal";

/** "Rêve" and "reve", "J&J" and "jj" all find the same place */
const fold = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Add a review: just ate somewhere? Find it here and the review form opens on its page. Places
 * you stamped lately come first (you probably just went), then everything matches as you type:
 * name, neighborhood, cuisine or the thing it's known for.
 */
export default function AddReview({ spots, onPick, onClose }: { spots: Spot[]; onPick: (id: string) => void; onClose: () => void }) {
  const { been } = useApp();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => input.current?.focus(), 120);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const index = useMemo(
    () =>
      spots.map((s) => ({
        s,
        name: fold(s.name),
        rest: fold(`${areaLabelOf(s)} ${s.genres.map((g) => GENRE_BY_ID[g]?.label ?? "").join(" ")} ${s.knownFor}`),
      })),
    [spots]
  );
  const recent = useMemo(
    () =>
      spots
        .filter((s) => been[s.id])
        .sort((a, b) => (been[b.id]?.at ?? "").localeCompare(been[a.id]?.at ?? ""))
        .slice(0, 8),
    [spots, been]
  );
  const results = useMemo(() => {
    const t = fold(q);
    if (!t) return [];
    const words = t.split(" ");
    return index
      .map((x) => {
        const starts = x.name.startsWith(t) ? 3 : x.name.split(" ").some((w) => w.startsWith(words[0])) ? 2 : 0;
        const all = words.every((w) => x.name.includes(w) || x.rest.includes(w));
        return { s: x.s, score: all ? starts + (words.every((w) => x.name.includes(w)) ? 1 : 0) : -1 };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score || b.s.pop - a.s.pop)
      .slice(0, 30)
      .map((x) => x.s);
  }, [q, index]);

  const shown = q.trim() ? results : recent;
  return (
    <Portal>
      <AnimatePresence>
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="modal where add-review"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ar-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="sheet-head">
              <h2 className="modal-title" id="ar-title">
                Add a review
              </h2>
              <button className="modal-x" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            <div className="sheet-body">
              <label className="search ar-search">
                <Icon name="search" size={18} />
                <span className="sr-only">Where did you eat?</span>
                <input
                  ref={input}
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Where did you eat?"
                  autoComplete="off"
                  enterKeyHint="search"
                  onKeyDown={(e) => e.key === "Enter" && shown[0] && onPick(shown[0].id)}
                />
              </label>
              {!q.trim() && recent.length > 0 && <p className="ar-label">Places you&apos;ve been lately</p>}
              {!q.trim() && !recent.length && <p className="ar-hint">Type the name of the place, the neighborhood or what you had.</p>}
              {q.trim() && !results.length && <p className="ar-hint">No place matches that. Check the spelling, or try the neighborhood.</p>}
              {shown.length > 0 && (
                <ul className="ar-list">
                  {shown.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="ar-row" onClick={() => onPick(s.id)}>
                        <Thumb spot={s} w={48} />
                        <span className="ar-main">
                          <b>{s.name}</b>
                          <span>
                            {GENRE_BY_ID[s.genres[0]]?.short ?? ""} · {areaLabelOf(s).split(" & ")[0]}
                          </span>
                        </span>
                        <span className="ar-go">Review</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
