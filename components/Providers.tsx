"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getBackend, shortName, type Backend, type BeenMap, type Stamp, type User, type Verdict } from "@/lib/backend";
import { identify, track } from "@/lib/analytics";
import { HOME_KEY } from "@/lib/regions";
import AuthModal, { type AuthStep } from "./AuthModal";

export type { BeenMap, Verdict } from "@/lib/backend";

type Toast = { id: number; text: string; tone?: "ok" | "err" };

type Ctx = {
  backend: Backend;
  user: User | null;
  /** true when signed in; otherwise opens sign-in and, once they're in, runs `then` so nobody has to tap twice */
  requireAuth: (reason?: string, then?: () => void) => boolean;
  openAuth: (reason?: string, then?: () => void) => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  saved: string[];
  toggleSaved: (id: string) => void;
  been: BeenMap;
  /** stamp a place (optionally with how it went); null takes the stamp back */
  markBeen: (id: string, verdict?: Verdict | null) => void;
  /** where the map opens every visit (lib/regions); null until someone picks one */
  home: string | null;
  setHome: (home: string) => void;
};

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
  const [saved, setSaved] = useState<string[]>([]);
  const [been, setBeen] = useState<BeenMap>({});
  const beenRef = useRef<BeenMap>({});
  const [home, setHomeState] = useState<string | null>(null);
  const tid = useRef(0);
  const synced = backend.mode === "supabase";

  const applyUser = useCallback((u: User | null) => {
    userRef.current = u;
    setUser(u);
  }, []);

  useEffect(() => {
    backend.getUser().then(applyUser);
    return backend.onAuth(applyUser);
  }, [backend, applyUser]);

  useEffect(() => {
    setSaved(readJson<string[]>(SAVED_KEY, []));
    const b = readJson<BeenMap>(BEEN_KEY, {});
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
  // Guests keep theirs on the device; the moment they sign in it all moves into the account.
  const lastUser = useRef<string | null>(null);
  useEffect(() => {
    const id = user?.id ?? null;
    const prev = lastUser.current;
    lastUser.current = id;
    if (!synced) return;
    if (!id) {
      if (prev) {
        // signed out: the lists are safe in the account; take them off this device
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
      let nextSaved = remote.saved;
      let nextBeen = remote.been;
      if (!owner) {
        const m = mergeGuest(remote, readJson<string[]>(SAVED_KEY, []), readJson<BeenMap>(BEEN_KEY, {}));
        nextSaved = m.mergedSaved;
        nextBeen = m.mergedBeen;
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
    })();
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
    // pick up right where they were: the review form opens, the photo picker opens…
    if (next && userRef.current) setTimeout(next, 80);
  }, []);

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

  const toggleSaved = useCallback(
    (id: string) => {
      const had = saved.includes(id);
      const next = had ? saved.filter((x) => x !== id) : [...saved, id];
      setSaved(next);
      persist(SAVED_KEY, next);
      toast(had ? "Off your want-to-try list" : "On your want-to-try list");
      track(had ? "remove_from_wishlist" : "add_to_wishlist", { item_id: id });
      if (synced && userRef.current) backend.putSaved(id, !had).catch(() => toast("Couldn't save that to your account. Check your connection?", "err"));
    },
    [saved, toast, backend, synced]
  );

  const markBeen = useCallback(
    (id: string, verdict?: Verdict | null) => {
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
    },
    [backend, synced, toast]
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

  const value = useMemo(
    () => ({ backend, user, requireAuth, openAuth, toast, saved, toggleSaved, been, markBeen, home, setHome }),
    [backend, user, requireAuth, openAuth, toast, saved, toggleSaved, been, markBeen, home, setHome]
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      <AuthModal open={auth.open} reason={auth.reason} step={auth.step} onSignedIn={applyUser} onClose={closeAuth} />
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
