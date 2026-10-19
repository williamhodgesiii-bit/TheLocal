"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@/lib/analytics";
import { useApp } from "./Providers";
import GoogleButton from "./GoogleButton";

/**
 * The gentle first-visit sign-in prompt.
 *
 * Why it works the way it does (not a modal slammed up on load):
 *  - The whole site is public and indexed. A full-screen dialog over public content on arrival is
 *    the pattern Google's "intrusive interstitial" guidance penalises on mobile, and it buries the
 *    thing people came for. So this is a small, dismissible card to the side — never an overlay.
 *  - People should feel the place before they're asked to join, so it waits a few calm seconds.
 *  - It never nags: once dismissed it waits (3 days, then 2 weeks), gives up after three asks, and
 *    the moment someone signs in — here or anywhere — it's done for good. This mirrors how Google
 *    One Tap caps itself (2h → 1d → 1w → 4w, reset on success); we do the same for the card.
 *  - Only where it makes sense: signed out, on the map/passport pages, and never while the full
 *    sign-in dialog is already open. The copy tells the truth for the mode it's in — "every device"
 *    only when there's a real database behind it (Supabase); on-device otherwise.
 */
const KEY = "tl.signinNudge";
const DELAY = 4000; // let the page breathe first — value before the ask
const COOLDOWN_DAYS = [3, 14]; // the wait after the 1st and 2nd "maybe later"
const MAX_SHOWS = 3; // then stop asking for good
const DAY = 86_400_000;

/**
 * Pages that aren't the map/passport experience (reading the privacy page is no time to be nudged),
 * and Friends and member pages, which already ask in their own words.
 */
const SKIP = ["/admin", "/privacy", "/terms", "/about", "/partners", "/credits", "/auth", "/friends", "/u"];

/** Opening the full sign-in dialog even once this visit means they don't need a reminder too. */
let engagedThisVisit = false;

/** "Will" → "Will." but "Will H." stays "Will H." */
const stop = (name: string) => (name.endsWith(".") ? name : `${name}.`);

type Memo = { seen: number; at: number; done?: boolean };

function readMemo(): Memo {
  try {
    return { seen: 0, at: 0, ...(JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<Memo>) };
  } catch {
    return { seen: 0, at: 0 };
  }
}
function writeMemo(m: Memo) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* private mode: we just ask again next time, which is fine */
  }
}
function eligible(m: Memo) {
  if (m.done || m.seen >= MAX_SHOWS) return false;
  if (m.seen === 0) return true;
  const wait = COOLDOWN_DAYS[Math.min(m.seen - 1, COOLDOWN_DAYS.length - 1)] * DAY;
  return Date.now() - m.at >= wait;
}

export default function SignInNudge({ authOpen }: { authOpen: boolean }) {
  const { backend, user, openAuth, toast, saved, been } = useApp();
  const pathname = usePathname() || "/";
  const [show, setShow] = useState(false);

  if (authOpen) engagedThisVisit = true;
  const synced = backend.mode === "supabase";
  const onSkipPage = SKIP.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const suppressed = !!user || authOpen || engagedThisVisit || onSkipPage;

  // Signed in — here or in another tab — means never ask again: they've found the way in.
  useEffect(() => {
    if (user) {
      writeMemo({ ...readMemo(), done: true });
      setShow(false);
    }
  }, [user]);

  // First visit (and the capped re-asks) surface the card after a short, calm delay.
  useEffect(() => {
    if (suppressed) {
      setShow(false);
      return;
    }
    if (!eligible(readMemo())) return;
    const t = setTimeout(() => setShow(true), DELAY);
    return () => clearTimeout(t);
  }, [suppressed]);

  // Escape dismisses, like the real dialog.
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && later();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  function later() {
    const m = readMemo();
    writeMemo({ ...m, seen: m.seen + 1, at: Date.now() });
    setShow(false);
  }

  function openFull() {
    engagedThisVisit = true;
    setShow(false);
    openAuth();
  }

  async function google(idToken: string, nonce: string) {
    try {
      const u = await backend.signInWithGoogleToken(idToken, nonce);
      // the card hides itself once `user` turns truthy (and the welcome-name step, if any, is in Providers)
      track(u.isNew ? "sign_up" : "login", { method: "google" });
      toast(u.isNew ? `Welcome to the neighborhood, ${stop(u.name)}` : `Welcome back, ${stop(u.name)}`, "ok");
    } catch {
      openFull(); // anything odd: hand off to the full sign-in, which spells the error out
    }
  }

  const here = typeof window === "undefined" ? "/" : location.pathname + location.search;
  // a place both saved and stamped is still one place
  const guest = new Set([...saved, ...Object.keys(been)]).size;
  const hasGoogle = !!backend.googleClientId;

  // Say only what's true for this mode: cross-device sync is real only with a database behind it.
  const title = guest && synced ? "Keep your passport safe" : "Make it yours";
  const text =
    guest && synced
      ? `You've marked ${guest} ${guest === 1 ? "place" : "places"} on this device. Sign in — free, no password — to keep ${guest === 1 ? "it" : "them"} on every device you use.`
      : synced
        ? "Exploring is free. Sign in to stamp your Plate Passport, save places to try, spin Surprise me and write reviews, on every device. Free, and no password."
        : "Exploring is free. Sign in to stamp your Plate Passport, save places to try, spin Surprise me and write reviews. Free, and no password.";

  return (
    <AnimatePresence>
      {show && !suppressed && (
        <motion.aside
          className="nudge"
          aria-label="Sign in to The Plate Next Door"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          <button className="nudge-x" onClick={later} aria-label="Not now">
            ×
          </button>
          <span className="cap-kicker">The Plate Next Door</span>
          <h2 className="nudge-title">{title}</h2>
          <p className="nudge-text">{text}</p>

          {hasGoogle ? (
            <>
              <GoogleButton
                clientId={backend.googleClientId!}
                onToken={google}
                onFallback={() => backend.signInWithGoogleRedirect(here).catch(() => openFull())}
                oneTap={false}
              />
              <button type="button" className="textbtn nudge-email" onClick={openFull}>
                Prefer email? Sign in with a code
              </button>
            </>
          ) : (
            <button className="btn btn-green btn-block" onClick={openFull}>
              Sign in or join
            </button>
          )}

          <button type="button" className="textbtn nudge-later" onClick={later}>
            Maybe later
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
