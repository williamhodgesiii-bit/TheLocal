/**
 * One call for every product event. Sends to Vercel Analytics (always) and to
 * Google Analytics 4 when NEXT_PUBLIC_GA_ID is set — unless the visitor has
 * Global Privacy Control on or turned analytics off on /privacy, in which case
 * Google never loads.
 */
import { track as vercelTrack } from "@vercel/analytics";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const NO_ANALYTICS_KEY = "tl.noanalytics";

type Params = Record<string, string | number | boolean | null | undefined>;
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

/** Google Analytics is allowed for this visitor (configured, no GPC, not opted out). */
export function gaAllowed() {
  if (!GA_ID || typeof window === "undefined") return false;
  try {
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return false;
    if (localStorage.getItem(NO_ANALYTICS_KEY) === "1") return false;
  } catch {
    /* storage blocked: fall through */
  }
  return true;
}

/** Set up the gtag queue once (events fired before gtag.js arrives are kept, in order, after the config). */
export function gaBoot(): Gtag | null {
  if (typeof window === "undefined") return null;
  if (window.gtag) return window.gtag;
  if (!gaAllowed()) return null;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js reads the Arguments object itself, not an array
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID);
  return window.gtag;
}

export function track(event: string, params: Params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string | number | boolean | null>;
  try {
    vercelTrack(event, clean);
  } catch {
    /* ignore */
  }
  try {
    gaBoot()?.("event", event, clean);
  } catch {
    /* ignore */
  }
}

/** Tie GA sessions to the signed-in member (an opaque id, never an email). */
export function identify(userId: string | null, props: { home_city?: string } = {}) {
  const g = gaBoot();
  if (!g) return;
  g("config", GA_ID, { user_id: userId ?? undefined, send_page_view: false });
  if (props.home_city) g("set", "user_properties", { home_city: props.home_city });
}
