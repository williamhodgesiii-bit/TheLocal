"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { getBackend } from "@/lib/backend";

export default function AuthModal({ open, reason, onClose }: { open: boolean; reason?: string; onClose: () => void }) {
  const [tab, setTab] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const backend = getBackend();

  useEffect(() => {
    if (!open) return;
    setErr(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (tab === "up") await backend.signUp(name, email, password);
      else await backend.signIn(email, password);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="modal auth"
            role="dialog"
            aria-modal="true"
            aria-label="Sign in"
            initial={{ y: 30, rotate: -1.5, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="icon-btn modal-x" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
            <div className="stamp">Members only</div>
            <h2 className="display">{tab === "up" ? "Pull up a chair." : "Welcome back."}</h2>
            <p className="muted">{reason ?? "Locals review spots, share photos, and keep the list honest."}</p>

            <div className="seg">
              <button className={tab === "up" ? "on" : ""} onClick={() => setTab("up")} type="button">
                Join free
              </button>
              <button className={tab === "in" ? "on" : ""} onClick={() => setTab("in")} type="button">
                Sign in
              </button>
            </div>

            <form onSubmit={submit} className="form">
              {tab === "up" && (
                <label>
                  <span>Display name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Magic City Mae" required maxLength={40} />
                </label>
              )}
              <label>
                <span>Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6+ characters"
                  required
                  minLength={6}
                  autoComplete={tab === "up" ? "new-password" : "current-password"}
                />
              </label>
              {err && <p className="form-err">{err}</p>}
              <button className="btn btn-rust btn-block" disabled={busy}>
                {busy ? "One sec…" : tab === "up" ? "Create my account" : "Sign in"}
              </button>
            </form>
            {backend.mode === "local" && (
              <p className="fine">Demo mode: accounts, reviews and photos are saved on this device until the site&apos;s database is connected.</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
