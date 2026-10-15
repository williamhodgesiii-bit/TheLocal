"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getBackend, type Backend, type User } from "@/lib/backend";
import { HOME_KEY } from "@/lib/regions";
import AuthModal from "./AuthModal";

type Toast = { id: number; text: string; tone?: "ok" | "err" };

/** how a visit went, Beli-style: three honest choices instead of five stars */
export type Verdict = "loved" | "liked" | "meh";
/** places you've eaten at: the Plate Passport */
export type BeenMap = Record<string, { at: string; verdict?: Verdict }>;

type Ctx = {
  backend: Backend;
  user: User | null;
  requireAuth: (reason?: string) => boolean;
  openAuth: (reason?: string) => void;
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

export default function Providers({ children }: { children: ReactNode }) {
  const backend = useMemo(() => getBackend(), []);
  const [user, setUser] = useState<User | null>(null);
  const [auth, setAuth] = useState<{ open: boolean; reason?: string }>({ open: false });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [been, setBeen] = useState<BeenMap>({});
  const [home, setHomeState] = useState<string | null>(null);
  const tid = useRef(0);

  useEffect(() => {
    backend.getUser().then(setUser);
    return backend.onAuth(setUser);
  }, [backend]);

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
      setBeen(JSON.parse(localStorage.getItem(BEEN_KEY) || "{}"));
      setHomeState(localStorage.getItem(HOME_KEY));
    } catch {
      /* private mode */
    }
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

  const toast = useCallback((text: string, tone?: Toast["tone"]) => {
    const id = ++tid.current;
    setToasts([{ id, text, tone }]); // newest replaces the last; no stacking over content
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const openAuth = useCallback((reason?: string) => setAuth({ open: true, reason }), []);
  const requireAuth = useCallback(
    (reason?: string) => {
      if (user) return true;
      openAuth(reason);
      return false;
    },
    [user, openAuth]
  );

  const toggleSaved = useCallback(
    (id: string) => {
      const had = saved.includes(id);
      const next = had ? saved.filter((x) => x !== id) : [...saved, id];
      setSaved(next);
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      toast(had ? "Off your want-to-try list" : "On your want-to-try list");
    },
    [saved, toast]
  );

  const markBeen = useCallback((id: string, verdict?: Verdict | null) => {
    setBeen((cur) => {
      const next = { ...cur };
      if (verdict === null) delete next[id];
      else next[id] = { at: cur[id]?.at ?? new Date().toISOString(), verdict: verdict ?? cur[id]?.verdict };
      try {
        localStorage.setItem(BEEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

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
      <AuthModal open={auth.open} reason={auth.reason} onClose={() => setAuth({ open: false })} />
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
