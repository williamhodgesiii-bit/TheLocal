"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getBackend, type Backend, type User } from "@/lib/backend";
import AuthModal from "./AuthModal";

type Toast = { id: number; text: string; tone?: "ok" | "err" };

type Ctx = {
  backend: Backend;
  user: User | null;
  requireAuth: (reason?: string) => boolean;
  openAuth: (reason?: string) => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  saved: string[];
  toggleSaved: (id: string) => void;
};

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside Providers");
  return c;
};

const SAVED_KEY = "tl.saved";

export default function Providers({ children }: { children: ReactNode }) {
  const backend = useMemo(() => getBackend(), []);
  const [user, setUser] = useState<User | null>(null);
  const [auth, setAuth] = useState<{ open: boolean; reason?: string }>({ open: false });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const tid = useRef(0);

  useEffect(() => {
    backend.getUser().then(setUser);
    return backend.onAuth(setUser);
  }, [backend]);

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
    } catch {
      /* private mode */
    }
  }, []);

  const toast = useCallback((text: string, tone?: Toast["tone"]) => {
    const id = ++tid.current;
    setToasts((t) => [...t, { id, text, tone }]);
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
      toast(had ? "Removed from your list" : "Saved to your list ♥");
    },
    [saved, toast]
  );

  const value = useMemo(
    () => ({ backend, user, requireAuth, openAuth, toast, saved, toggleSaved }),
    [backend, user, requireAuth, openAuth, toast, saved, toggleSaved]
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
