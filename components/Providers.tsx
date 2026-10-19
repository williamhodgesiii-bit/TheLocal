"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getBackend, shortName, type Backend, type BeenMap, type Stamp, type User, type Verdict } from "@/lib/backend";
import { identify, track } from "@/lib/analytics";
import { HOME_KEY } from "@/lib/regions";
import { canonicalSpotId } from "@/lib/data";
import type { Me } from "@/lib/social";
import AuthModal, { type AuthStep } from "./AuthModal";
import SignInNudge from "./SignInNudge";

export type { BeenMap, Verdict } from "@/lib/backend";

type Toast = { id: number; text: string; tone?: "ok" | "err" };

type Ctx = {
  backend: Backend;
  user: User | null;
  /** false until we know whether someone's signed in (so a member never sees the signed-out view flash) */
  authReady: boolean;
  /** true when signed in; otherwise opens sign-in and, once they're in, runs `then` so nobody has to tap twice */
  requireAuth: (reason?: string, then?: () => void) => boolean;
  openAuth: (reason?: string, then?: () => void) => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  saved: string[];
  /** members only: a guest is asked to sign in, and the place is saved the moment they're in */
  toggleSaved: (id: string) => void;
  been: BeenMap;
  /**
   * Stamp a place (optionally with how it went); null takes the stamp back. Members only, like
   * toggleSaved. `done` gets the passport's new stamp count once the stamp has landed.
   */
  markBeen: (id: string, verdict?: Verdict | null, done?: (count: number) => void) => void;
  /** where the map opens every visit (lib/regions); null until someone picks one */
  home: string | null;
  setHome: (home: string) => void;
  /** put a place on (or off) the want-to-try list without toggling; members only */
  saveSpot: (id: string, on: boolean) => void;
  /** my public side (@name, privacy); null when signed out or before it loads */
  me: Me | null;
  setMe: (m: Me) => void;
  /** notifications not read yet, checked every minute while the page is open */
  unread: number;
  refreshUnread: () => void;
  /** in-app moves the map page registers (a full page load when it hasn't) */
  nav: Nav;
  registerNav: (n: Partial<Nav> | null) => void;
};
export type Nav = { member: (handle: string) => void; spot: (id: string) => void; friends: (tab?: "following" | "everyone" | "activity") => void };

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside Providers");
  return c;
};

const SAVED_KEY = "tl.saved";
const BEEN_KEY = "tl.been";
/** whose account the lists on this device mirror; missing = a guest's lists, not in any account yet */
const OWNER_KEY = "tl.lists.owner";

function persist(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}
/** saves and stamps made under a place's old per-location ids count for its one listing */
const canonSaved = (list: string[]) => Array.from(new Set(list.map(canonicalSpotId)));
function canonBeen(map: BeenMap): BeenMap {
  const out: BeenMap = {};
  for (const [k, v] of Object.entries(map)) {
    const id = canonicalSpotId(k);
    const cur = out[id];
    out[id] = !cur ? v : { at: cur.at < v.at ? cur.at : v.at, ...(cur.verdict ?? v.verdict ? { verdict: cur.verdict ?? v.verdict } : {}) };
  }
  return out;
}
function readJson<T>(k: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(k) || "") as T;
  } catch {
    return fallback;
  }
}

/**
 * A guest's lists folded into the account they just made or signed in to: nothing a person did
 * before signing up is ever lost. Keeps the earliest stamp date and any verdict.
 */
function mergeGuest(remote: { saved: string[]; been: BeenMap }, saved: string[], been: BeenMap) {
  const mergedSaved = Array.from(new Set([...remote.saved, ...saved]));
  const mergedBeen: BeenMap = { ...been };
  for (const [k, r] of Object.entries(remote.been)) {
    const l = been[k];
    const verdict = r.verdict ?? l?.verdict;
    mergedBeen[k] = { at: l && l.at < r.at ? l.at : r.at, ...(verdict ? { verdict } : {}) };
  }
  const upSaved = mergedSaved.filter((x) => !remote.saved.includes(x));
  const upBeen = Object.fromEntries(
    Object.entries(mergedBeen).filter(([k, v]) => !remote.been[k] || remote.been[k].at !== v.at || remote.been[k].verdict !== v.verdict)
  ) as BeenMap;
  const newStamps = Object.keys(upBeen).filter((k) => !remote.been[k]).length;
  return { mergedSaved, mergedBeen, upSaved, upBeen, newStamps };
}

export default function Providers({ children }: { children: ReactNode }) {
  const backend = useMemo(() => getBackend(), []);
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [auth, setAuth] = useState<{ open: boolean; reason?: string; step?: AuthStep }>({ open: false });
  const pending = useRef<(() => void) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const savedRef = useRef<string[]>([]);
  const [been, setBeen] = useState<BeenMap>({});
  const beenRef = useRef<BeenMap>({});
  const [home, setHomeState] = useState<string | null>(null);
  const tid = useRef(0);
  const synced = backend.mode === "supabase";
  const [me, setMe] = useState<Me | null>(null);
  const [unread, setUnread] = useState(0);
  const navRef = useRef<Partial<Nav> | null>(null);

  const applyUser = useCallback((u: User | null) => {
    userRef.current = u;
    setUser(u);
  }, []);

  /** whose lists are loaded; anything tapped before signing in waits for them, so the pull can't overwrite it */
  const listsFor = useRef<string | null>(null);
  const waiting = useRef<(() => void)[]>([]);
  const listsLoaded = useCallback((id: string | null) => {
    listsFor.current = id;
    const run = waiting.current;
    waiting.current = [];
    run.forEach((f) => f());
  }, []);
  const afterLists = useCallback(
    (fn: () => void) => {
      const id = userRef.current?.id;
      if (!synced || !id || listsFor.current === id) return fn();
      waiting.current.push(fn);
      // a slow or stuck pull never holds it up for long
      setTimeout(() => {
        if (!waiting.current.includes(fn)) return;
        waiting.current = waiting.current.filter((f) => f !== fn);
        fn();
      }, 4000);
    },
    [synced]
  );

  useEffect(() => {
    backend
      .getUser()
      .then(applyUser, () => {})
      .finally(() => setAuthReady(true));
    return backend.onAuth(applyUser);
  }, [backend, applyUser]);

  useEffect(() => {
    savedRef.current = canonSaved(readJson<string[]>(SAVED_KEY, []));
    setSaved(savedRef.current);
    const b = canonBeen(readJson<BeenMap>(BEEN_KEY, {}));
    beenRef.current = b;
    setBeen(b);
    try {
      setHomeState(localStorage.getItem(HOME_KEY));
    } catch {
      /* private mode */
    }
  }, []);

  const toast = useCallback((text: string, tone?: Toast["tone"]) => {
    const id = ++tid.current;
    setToasts([{ id, text, tone }]); // newest replaces the last; no stacking over content
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  // a member's home follows them to any device they sign in on
  // (and an account from before homes existed takes the one picked on this device)
  useEffect(() => {
    if (!user) return;
    try {
      if (user.home) {
        setHomeState(user.home);
        localStorage.setItem(HOME_KEY, user.home);
      } else {
        const local = localStorage.getItem(HOME_KEY);
        if (local) backend.updateHome(local).catch(() => {});
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.home, backend]);

  // analytics: tie the session to the member (an opaque id), and let go on sign-out
  const identified = useRef(false);
  useEffect(() => {
    if (user) {
      identify(user.id, user.home ? { home_city: user.home } : {});
      identified.current = true;
    } else if (identified.current) {
      identify(null);
      identified.current = false;
    }
  }, [user?.id, user?.home]); // eslint-disable-line react-hooks/exhaustive-deps

  // The want-to-try list and the passport live in the account, so they follow a member to any device.
  // Lists a guest made on a device before these became members-only move into the account at sign-in.
  const lastUser = useRef<string | null>(null);
  useEffect(() => {
    const id = user?.id ?? null;
    const prev = lastUser.current;
    lastUser.current = id;
    if (!synced) return;
    if (!id) {
      listsFor.current = null;
      waiting.current = [];
      if (prev) {
        // signed out: the lists are safe in the account; take them off this device
        savedRef.current = [];
        setSaved([]);
        beenRef.current = {};
        setBeen({});
        try {
          localStorage.removeItem(SAVED_KEY);
          localStorage.removeItem(BEEN_KEY);
          localStorage.removeItem(OWNER_KEY);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    let cancelled = false;
    (async () => {
      let remote: { saved: string[]; been: BeenMap };
      try {
        remote = await backend.pullLists();
      } catch {
        return; // database not set up yet: keep the device copy as it is
      }
      if (cancelled) return;
      let owner: string | null = null;
      try {
        owner = localStorage.getItem(OWNER_KEY);
      } catch {
        /* ignore */
      }
      let nextSaved = canonSaved(remote.saved);
      let nextBeen = canonBeen(remote.been);
      if (!owner) {
        const m = mergeGuest(remote, readJson<string[]>(SAVED_KEY, []), readJson<BeenMap>(BEEN_KEY, {}));
        nextSaved = canonSaved(m.mergedSaved);
        nextBeen = canonBeen(m.mergedBeen);
        if (m.upSaved.length || Object.keys(m.upBeen).length) {
          try {
            await backend.pushLists(m.upSaved, m.upBeen);
            const parts = [m.newStamps && `${m.newStamps} stamp${m.newStamps === 1 ? "" : "s"}`, m.upSaved.length && `${m.upSaved.length} saved place${m.upSaved.length === 1 ? "" : "s"}`].filter(Boolean);
            if (parts.length) toast(`Your ${parts.join(" and ")} moved into your account.`, "ok");
          } catch {
            /* still on this device; we'll try again next sign-in */
            return;
          }
        }
      }
      if (cancelled) return;
      savedRef.current = nextSaved;
      setSaved(nextSaved);
      beenRef.current = nextBeen;
      setBeen(nextBeen);
      persist(SAVED_KEY, nextSaved);
      persist(BEEN_KEY, nextBeen);
      try {
        localStorage.setItem(OWNER_KEY, id);
      } catch {
        /* ignore */
      }
    })().finally(() => {
      // however the pull went, the lists on screen are this member's now: let held taps through
      if (!cancelled) listsLoaded(id);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, backend, synced, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAuth = useCallback((reason?: string, then?: () => void) => {
    pending.current = then ?? null;
    setAuth({ open: true, reason });
  }, []);
  const requireAuth = useCallback(
    (reason?: string, then?: () => void) => {
      if (userRef.current) return true;
      openAuth(reason, then);
      return false;
    },
    [openAuth]
  );
  const closeAuth = useCallback(() => {
    setAuth({ open: false });
    const next = pending.current;
    pending.current = null;
    // pick up right where they were: the review form opens, the stamp lands… once their lists are in
    if (next && userRef.current) setTimeout(() => afterLists(next), 80);
  }, [afterLists]);

  // first name for a new member: Google already told us; anyone else gets one friendly question
  useEffect(() => {
    if (!user?.needsName) return;
    if (user.fullName) {
      backend.updateName(shortName(user.fullName) || user.name).catch(() => {});
      return;
    }
    // signed in from the link in the email, not the dialog: say hi and ask the one thing
    setAuth((a) => (a.open ? a : { open: true, step: "welcome" }));
  }, [user?.id, user?.needsName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exploring is open to everyone; the want-to-try list and the passport belong to an account.
  // A guest who taps one is asked to sign in, and what they tapped happens the moment they're in.
  const setSavedOn = useCallback(
    (id: string, on: boolean) => {
      const cur = savedRef.current;
      if (cur.includes(id) !== on) {
        const next = on ? [...cur, id] : cur.filter((x) => x !== id);
        savedRef.current = next;
        setSaved(next);
        persist(SAVED_KEY, next);
        track(on ? "add_to_wishlist" : "remove_from_wishlist", { item_id: id });
        if (synced && userRef.current) backend.putSaved(id, on).catch(() => toast("Couldn't save that to your account. Check your connection?", "err"));
      }
      toast(on ? "On your want-to-try list" : "Off your want-to-try list");
    },
    [toast, backend, synced]
  );
  const toggleSaved = useCallback(
    (id: string) => {
      if (!userRef.current) return openAuth("Sign in to save places to your want-to-try list. It takes a few seconds, no password.", () => setSavedOn(id, true));
      setSavedOn(id, !savedRef.current.includes(id));
    },
    [openAuth, setSavedOn]
  );

  const applyStamp = useCallback(
    (id: string, verdict?: Verdict | null, done?: (count: number) => void) => {
      const cur = beenRef.current;
      const next = { ...cur };
      let stamp: Stamp | null = null;
      if (verdict === null) delete next[id];
      else {
        const v = verdict ?? cur[id]?.verdict;
        stamp = { at: cur[id]?.at ?? new Date().toISOString(), ...(v ? { verdict: v } : {}) };
        next[id] = stamp;
      }
      beenRef.current = next;
      setBeen(next);
      persist(BEEN_KEY, next);
      track(stamp ? "stamp" : "unstamp", { id, ...(stamp?.verdict ? { verdict: stamp.verdict } : {}) });
      if (synced && userRef.current) backend.putStamp(id, stamp).catch(() => toast("Couldn't save that stamp to your account. Check your connection?", "err"));
      done?.(Object.keys(next).length);
    },
    [backend, synced, toast]
  );
  const markBeen = useCallback(
    (id: string, verdict?: Verdict | null, done?: (count: number) => void) => {
      if (!userRef.current) return openAuth("Sign in to stamp your Plate Passport. It takes a few seconds, no password.", () => applyStamp(id, verdict, done));
      applyStamp(id, verdict, done);
    },
    [openAuth, applyStamp]
  );

  const setHome = useCallback(
    (h: string) => {
      setHomeState(h);
      try {
        localStorage.setItem(HOME_KEY, h);
      } catch {
        /* ignore */
      }
      if (user && user.home !== h) backend.updateHome(h).catch(() => toast("Couldn't save your home to your account. Try again?", "err"));
    },
    [user, backend, toast]
  );

  const saveSpot = useCallback(
    (id: string, on: boolean) => {
      if (!userRef.current) return openAuth("Sign in to save places to your want-to-try list. It takes a few seconds, no password.", () => setSavedOn(id, on));
      setSavedOn(id, on);
    },
    [openAuth, setSavedOn]
  );

  // my @name and privacy, made the first time it's needed; a new name re-reads it
  useEffect(() => {
    if (!user) return setMe(null);
    let live = true;
    backend
      .myMember()
      .then((m) => live && setMe(m))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [user?.id, user?.name, backend]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshUnread = useCallback(() => {
    if (!userRef.current) return setUnread(0);
    backend.unread().then(setUnread, () => {});
  }, [backend]);
  // once a minute while the page is in front, and right away when it comes back
  useEffect(() => {
    if (!user) return setUnread(0);
    refreshUnread();
    const tick = () => document.visibilityState === "visible" && refreshUnread();
    const t = window.setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [user?.id, refreshUnread]); // eslint-disable-line react-hooks/exhaustive-deps

  const registerNav = useCallback((n: Partial<Nav> | null) => {
    navRef.current = n;
  }, []);
  const nav = useMemo<Nav>(
    () => ({
      member: (h) => (navRef.current?.member ? navRef.current.member(h) : location.assign(`/u/${h}`)),
      spot: (id) => (navRef.current?.spot ? navRef.current.spot(id) : location.assign(`/spot/${id}`)),
      friends: (tab) => (navRef.current?.friends ? navRef.current.friends(tab) : location.assign(tab ? `/friends?tab=${tab}` : "/friends")),
    }),
    []
  );

  const value = useMemo(
    () => ({
      backend, user, authReady, requireAuth, openAuth, toast, saved, toggleSaved, been, markBeen, home, setHome, saveSpot, me, setMe, unread,
      refreshUnread, nav, registerNav,
    }),
    [backend, user, authReady, requireAuth, openAuth, toast, saved, toggleSaved, been, markBeen, home, setHome, saveSpot, me, unread, refreshUnread, nav, registerNav]
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      <AuthModal open={auth.open} reason={auth.reason} step={auth.step} onSignedIn={applyUser} onClose={closeAuth} />
      <SignInNudge authOpen={auth.open} />
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast ${t.tone ?? ""}`}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  );
}
