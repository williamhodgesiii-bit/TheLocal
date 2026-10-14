"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { DRINK_KINDS, GENRES, priceLabel, type DrinkKind, type GenreId } from "@/lib/data";
import { PlateIcon } from "./PlateIcons";

/**
 * The browse bar, the same on phones and computers. Three steps, top to bottom:
 * search, what sounds good (the plates), then where / price / saved.
 * Everything shows its current value, so you can always see what's narrowing the list.
 */
export default function BrowseBar(p: {
  searchRef: RefObject<HTMLInputElement>;
  query: string;
  setQuery: (q: string) => void;
  genre: GenreId | "all";
  chooseGenre: (g: GenreId | "all") => void;
  genreCounts: Record<string, number>;
  drink: DrinkKind | "all";
  setDrink: (d: DrinkKind | "all") => void;
  whereLabel: string;
  whereOn: boolean;
  openWhere: () => void;
  prices: number[];
  setPrices: (f: (x: number[]) => number[]) => void;
  savedOnly: boolean;
  setSavedOnly: (v: boolean) => void;
  savedCount: number;
  tucked?: boolean;
}) {
  return (
    <div className={`browse ${p.tucked ? "tucked" : ""}`}>
      <label className="b-search">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="sr-only">Search</span>
        <input
          ref={p.searchRef}
          type="search"
          enterKeyHint="search"
          value={p.query}
          onChange={(e) => p.setQuery(e.target.value)}
          placeholder="Search dishes, places, patios"
        />
        {p.query && (
          <button type="button" className="b-search-x" onClick={() => p.setQuery("")} aria-label="Clear search">
            ×
          </button>
        )}
      </label>

      <Plates genre={p.genre} choose={p.chooseGenre} counts={p.genreCounts} />

      {p.genre === "drinks" && (
        <div className="b-row b-sub" role="group" aria-label="Kind of drinks">
          {[{ id: "all" as const, label: "All drinks" }, ...DRINK_KINDS].map((k) => (
            <button key={k.id} type="button" className={`b-chip b-chip-sm ${p.drink === k.id ? "on" : ""}`} aria-pressed={p.drink === k.id} onClick={() => p.setDrink(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
      )}

      <div className="b-row" role="group" aria-label="Narrow it down">
        <button type="button" className={`b-chip b-pick ${p.whereOn ? "on" : ""}`} onClick={p.openWhere} aria-haspopup="dialog">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.3" fill="currentColor" />
          </svg>
          <span className="b-pick-v">{p.whereLabel}</span>
          <Caret />
        </button>
        <PriceChip prices={p.prices} setPrices={p.setPrices} />
        {(p.savedCount > 0 || p.savedOnly) && (
          <button type="button" className={`b-chip ${p.savedOnly ? "on" : ""}`} aria-pressed={p.savedOnly} onClick={() => p.setSavedOnly(!p.savedOnly)}>
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill={p.savedOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            Saved <span className="b-n">{p.savedCount}</span>
          </button>
        )}
      </div>
    </div>
  );
}

const Caret = () => (
  <svg className="b-caret" viewBox="0 0 12 12" width="10" height="10" aria-hidden>
    <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** "What sounds good?" Every kind of food on its own little plate, in one row that scrolls sideways. */
function Plates({ genre, choose, counts }: { genre: GenreId | "all"; choose: (g: GenreId | "all") => void; counts: Record<string, number> }) {
  const row = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const measure = useCallback(() => {
    const el = row.current;
    if (el) setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (row.current) ro.observe(row.current);
    return () => ro.disconnect();
  }, [measure]);
  const nudge = (d: 1 | -1) => row.current?.scrollBy({ left: d * row.current.clientWidth * 0.7, behavior: "smooth" });

  const items: { id: GenreId | "all"; label: string }[] = [{ id: "all", label: "All" }, ...GENRES.map((g) => ({ id: g.id, label: g.short }))];
  return (
    <div className={`b-plates-wrap ${edge.l ? "more-l" : ""} ${edge.r ? "more-r" : ""}`}>
      <div className="b-plates" ref={row} onScroll={measure} role="group" aria-label="What sounds good?">
        {items.map((g) => (
          <PlateButton key={g.id} id={g.id} label={g.label} on={genre === g.id} zero={g.id !== "all" && !counts[g.id]} onClick={() => choose(g.id)} />
        ))}
      </div>
      {/* mouse users get arrows; fingers just swipe */}
      <button type="button" className="b-arrow b-arrow-l" onClick={() => nudge(-1)} aria-label="Show earlier kinds of food" tabIndex={-1}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <path d="M14.5 6 8.5 12l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button type="button" className="b-arrow b-arrow-r" onClick={() => nudge(1)} aria-label="Show more kinds of food" tabIndex={-1}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function PlateButton({ id, label, on, zero, onClick }: { id: GenreId | "all"; label: string; on: boolean; zero: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  // keep the chosen plate in view (it may have been picked from a link or the map)
  useEffect(() => {
    const b = ref.current;
    const r = b?.parentElement;
    if (!on || !b || !r) return;
    const l = b.offsetLeft;
    if (l < r.scrollLeft + 24 || l + b.offsetWidth > r.scrollLeft + r.clientWidth - 24) r.scrollTo({ left: l - (r.clientWidth - b.offsetWidth) / 2, behavior: "smooth" });
  }, [on]);
  return (
    <button ref={ref} type="button" className={`b-plate ${on ? "on" : ""} ${zero ? "zero" : ""}`} aria-pressed={on} onClick={onClick}>
      <span className="plate">
        <PlateIcon k={id} />
      </span>
      <span className="b-plate-label">{label}</span>
    </button>
  );
}

const PRICE_WORDS = ["", "Cheap eats", "Casual", "Nice night out", "Splurge"];

function PriceChip({ prices, setPrices }: { prices: number[]; setPrices: (f: (x: number[]) => number[]) => void }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const label = prices.length ? [...prices].sort().map(priceLabel).join(", ") : "Any price";
  return (
    <>
      <button ref={btn} type="button" className={`b-chip b-pick ${prices.length ? "on" : ""}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="b-pick-v">{label}</span>
        <Caret />
      </button>
      <Pop open={open} onClose={() => setOpen(false)} anchor={btn} title="Price">
        <div className="pop-prices">
          {[1, 2, 3, 4].map((n) => {
            const on = prices.includes(n);
            return (
              <button key={n} type="button" className={`pop-price ${on ? "on" : ""}`} aria-pressed={on} onClick={() => setPrices((x) => (on ? x.filter((y) => y !== n) : [...x, n]))}>
                <b>{priceLabel(n)}</b>
                <span>{PRICE_WORDS[n]}</span>
              </button>
            );
          })}
        </div>
        <div className="pop-foot">
          <button type="button" className="textbtn" onClick={() => setPrices(() => [])} disabled={!prices.length}>
            Any price
          </button>
          <button type="button" className="btn btn-green" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </Pop>
    </>
  );
}

/**
 * A small panel under its button on a computer; a sheet from the bottom on a phone.
 * Portaled to <body> so the sidebar's scrolling never clips it.
 */
export function Pop({ open, onClose, anchor, title, children }: { open: boolean; onClose: () => void; anchor: RefObject<HTMLElement>; title: string; children: ReactNode }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => setReady(true), []);
  // keyboard: land on the first choice when it opens, back on the button when it closes
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>(".pop-head ~ * button")?.focus({ preventScroll: true }), 30);
    const back = anchor.current;
    return () => {
      clearTimeout(t);
      if (back && panel.current?.contains(document.activeElement)) back.focus({ preventScroll: true });
    };
  }, [open, anchor]);
  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    setPos({ top: Math.round(r.bottom + 8), left: Math.round(Math.max(12, Math.min(r.left, window.innerWidth - 312))) });
  }, [open, anchor]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!ready) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="pop-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onMouseDown={onClose}>
          <motion.div
            ref={panel}
            className="pop"
            role="dialog"
            aria-label={title}
            style={{ top: pos.top, left: pos.left }}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="pop-head">
              <h3>{title}</h3>
              <button type="button" className="modal-x" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
