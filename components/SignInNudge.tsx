"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@/lib/analytics";
import { useApp } from "./Providers";
import GoogleButton from "./GoogleButton";

/**
 * The sign-in card for people who aren't signed in yet.
 *
 * Nearly everything on the site needs an account (searching restaurants is the exception), so
 * this card comes back on every visit: a few seconds in, and again a few minutes after "Maybe
 * later". It's a small card at the side, never a full-screen wall over the page (Google penalises
 * those on mobile, and it would bury the search people came for). The full sign-in dialog opens
 * whenever someone taps something that needs an account. Signed in, and it's gone for good.
 */
const FIRST = 5000; // a few seconds to look around first
const AGAIN = 4 * 60_000; // after "Maybe later" (or closing the sign-in dialog), ask again later this visit

/** Pages where asking makes no sense (reading the privacy page is no time to be nudged). */
const SKIP = ["/admin", "/privacy", "/terms", "/about", "/partners", "/credits", "/auth"];

/** when they last said "not now" this visit (a fresh visit asks again) */
let notNowAt = 0;

/** "Will" → "Will." but "Will H." stays "Will H." */
const stop = (name: string) => (name.endsWith(".") ? name : `${name}.`);

export default function SignInNudge({ authOpen }: { authOpen: boolean }) {
  const { backend, user, authReady, openAuth, toast } = useApp();
  const pathname = usePathname() || "/";
  const [show, setShow] = useState(false);

  const [tick, setTick] = useState(0);
  const synced = backend.mode === "supabase";
  const onSkipPage = SKIP.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const suppressed = !authReady || !!user || authOpen || onSkipPage;

  useEffect(() => {
    if (user) setShow(false);
  }, [user]);

  // the sign-in dialog was open and they closed it without joining: that's a "not now" too
  useEffect(() => {
    if (!authOpen) return;
    setShow(false);
    return () => {
      notNowAt = Date.now();
      setTick((t) => t + 1);
    };
  }, [authOpen]);

  // every visit: a few seconds in, then again a few minutes after each "not now"
  useEffect(() => {
    if (suppressed) {
      setShow(false);
      return;
    }
    const wait = notNowAt ? Math.max(1500, notNowAt + AGAIN - Date.now()) : FIRST;
    const t = setTimeout(() => setShow(true), wait);
    return () => clearTimeout(t);
  }, [suppressed, tick]);

  // Escape dismisses, like the real dialog.
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && later();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  function later() {
    notNowAt = Date.now();
    setShow(false);
    setTick((t) => t + 1);
  }

  function openFull() {
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
  const hasGoogle = !!backend.googleClientId;
  const title = "Join The Plate Next Door";
  const text = `See what Birmingham is eating, keep your Plate Passport, make lists and let Surprise me pick${synced ? ", on every device" : ""}. Free, no password.`;

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
