"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { createPortal } from "react-dom";
import { commonsSrcSet } from "@/lib/photos";
import type { Spot } from "@/lib/data";
import type { Photo as MemberPhoto } from "@/lib/backend";
import Photo from "./Photo";
import { Matchbook } from "./Cover";

export type Slide = { key: string; kind: "svg" | "img"; url?: string; file?: string; srcSet?: string; label: string; alt: string; credit?: string; link?: string; stock?: boolean };

/** a review's photos, small under the words; tap one to see them big */
export function ReviewPhotos({ photos, spot }: { photos?: MemberPhoto[]; spot: Spot }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos?.length) return null;
  const slides: Slide[] = photos.map((p) => ({ key: p.id, kind: "img", url: p.url, label: `From ${p.userName}'s review`, alt: `Photo from ${p.userName}'s review of ${spot.name}` }));
  return (
    <>
      <div className="rv-pics" data-count={photos.length}>
        {photos.map((p, i) => (
          <button key={p.id} type="button" className="rv-pic" onClick={() => setOpen(i)} aria-label={`See photo ${i + 1} of ${photos.length} bigger`}>
            <Photo src={p.url} alt={slides[i].alt} genre={spot.genres[0]} />
          </button>
        ))}
      </div>
      <AnimatePresence>{open !== null && <Lightbox slides={slides} index={open} spot={spot} onIndex={setOpen} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  );
}

export default function Lightbox({ slides, index, spot, onIndex, onClose }: { slides: Slide[]; index: number; spot: Spot; onIndex: (n: number) => void; onClose: () => void }) {
  const n = slides.length;
  const s = slides[index];
  const touch = useRef<{ x: number; y: number } | null>(null);
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);
  // warm the neighbors so swiping feels instant
  useEffect(() => {
    [slides[(index + 1) % n], slides[(index - 1 + n) % n]].forEach((x) => {
      if (x?.url) new Image().src = x.url;
    });
  }, [index, n, slides]);
  // portaled: the detail panel animates with a transform, which would trap a fixed overlay inside it
  return createPortal(
    <motion.div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Photos of ${spot.name}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const t = touch.current;
        touch.current = null;
        if (!t) return;
        const dx = e.changedTouches[0].clientX - t.x;
        const dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
        else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) onClose();
      }}
    >
      <button className="icon-btn lb-x" aria-label="Close">
        <X size={20} />
      </button>
      {n > 1 && (
        <button className="icon-btn lb-prev" aria-label="Previous" onClick={(e) => (e.stopPropagation(), go(-1))}>
          <ChevronLeft size={22} />
        </button>
      )}
      <motion.figure key={s.key} initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18 }} onClick={(e) => e.stopPropagation()}>
        <div className="lb-frame">{s.kind === "svg" ? <Matchbook spot={spot} /> : <Photo src={s.url!} srcSet={s.file ? commonsSrcSet(s.file) : s.srcSet} sizes="100vw" alt={s.alt} genre={spot.genres[0]} eager />}</div>
        <figcaption>
          <span>
            {s.stock ? "Stock photo: " : ""}
            {s.label}
            {s.credit && (
              <span className="credit">
                {" · "}
                {s.link ? (
                  <a href={s.link} target="_blank" rel="noreferrer">
                    {s.credit}
                  </a>
                ) : (
                  s.credit
                )}
              </span>
            )}
            {s.stock && <span className="credit"> · not taken at {spot.name}</span>}
          </span>
          <span className="lb-count">
            {index + 1} of {n}
          </span>
        </figcaption>
      </motion.figure>
      {n > 1 && (
        <button className="icon-btn lb-next" aria-label="Next" onClick={(e) => (e.stopPropagation(), go(1))}>
          <ChevronRight size={22} />
        </button>
      )}
    </motion.div>,
    document.body
  );
}
