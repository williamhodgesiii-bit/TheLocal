"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "tl.scrolledHome";
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A little "keep going" for the front page: a pill near the bottom with a dot that rolls
 * down, until the first scroll. People who already know to scroll (they've done it on three
 * visits) don't see it again.
 */
export default function ScrollCue() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let n = 0;
    try {
      n = Number(localStorage.getItem(SEEN_KEY) || 0);
    } catch {
      /* private mode */
    }
    if (n >= 3) return;
    let raf = 0;
    let gone = false;
    const done = () => {
      if (gone) return;
      gone = true;
      setShow(false);
      try {
        localStorage.setItem(SEEN_KEY, String(n + 1));
      } catch {
        /* ignore */
      }
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => window.scrollY > 60 && done());
    };
    const t = window.setTimeout(() => window.scrollY < 40 && setShow(true), 1400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      className="scroll-cue"
      onClick={() => window.scrollBy({ top: Math.round(window.innerHeight * 0.7), behavior: still() ? "auto" : "smooth" })}
      aria-label="Scroll down for more"
    >
      <span className="sc-track" aria-hidden>
        <span className="sc-dot" />
      </span>
      Scroll for more
    </button>
  );
}

/**
 * A one-time sideways nudge on a row you swipe (phones): it slides a little and settles back,
 * so it's obvious there's more to the side. Once per visit.
 */
export function useSwipeHint(ref: React.RefObject<HTMLElement>, key: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    try {
      if (sessionStorage.getItem(`tl.hint.${key}`)) return;
    } catch {
      /* ignore */
    }
    let t1 = 0;
    let t2 = 0;
    const io = new IntersectionObserver(
      (e) => {
        if (!e[0]?.isIntersecting) return;
        io.disconnect();
        if (el.scrollWidth <= el.clientWidth + 8 || still()) return;
        try {
          sessionStorage.setItem(`tl.hint.${key}`, "1");
        } catch {
          /* ignore */
        }
        t1 = window.setTimeout(() => {
          if (el.scrollLeft > 4) return; // they're already swiping
          el.scrollTo({ left: Math.min(84, el.clientWidth * 0.22), behavior: "smooth" });
          t2 = window.setTimeout(() => el.scrollLeft < 120 && el.scrollTo({ left: 0, behavior: "smooth" }), 650);
        }, 900);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [ref, key]);
}
