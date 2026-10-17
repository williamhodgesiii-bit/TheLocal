"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { User } from "@/lib/backend";
import { track } from "@/lib/analytics";
import { useApp } from "./Providers";
import GoogleButton from "./GoogleButton";

/**
 * Sign in or join, in one flow — no "new or returning?" fork, no password to make up or forget.
 *   1. Continue with Google (one tap), or type an email (a saved passkey autofills right there)
 *   2. Type the code we email (or tap the link in the same email — either works)
 *   3. New members only: "What should we call you?" prefilled, one tap to accept
 * Anyone who signs in mid-task lands right back in it (see requireAuth in Providers).
 */
export type AuthStep = "start" | "code" | "welcome";

const CODE_LEN = Math.min(10, Math.max(6, Number(process.env.NEXT_PUBLIC_AUTH_CODE_LENGTH) || 6));
const RESEND_AFTER = 60; // Supabase allows a new code once a minute
const LAST_EMAIL_KEY = "tl.lastEmail";

/** "Will" → "Will." but "Will H." stays "Will H." */
const stop = (name: string) => (name.endsWith(".") ? name : `${name}.`);
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again?");
// someone closing the passkey sheet or a newer request replacing an older one isn't an error to show
const cancelled = (e: unknown) => /abort|cancel|notallowed|timed out/i.test(`${(e as { name?: string })?.name ?? ""} ${(e as { code?: string })?.code ?? ""} ${message(e)}`);

export default function AuthModal({
  open,
  reason,
  step: firstStep = "start",
  onSignedIn,
  onClose,
}: {
  open: boolean;
  reason?: string;
  step?: AuthStep;
  onSignedIn: (u: User) => void;
  onClose: () => void;
}) {
  const { backend, user, toast } = useApp();
  const [step, setStep] = useState<AuthStep>(firstStep);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [passkeys, setPasskeys] = useState(false);
  const [passkeyAdded, setPasskeyAdded] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const autofill = useRef<AbortController | null>(null);
  const finished = useRef(false);

  // fresh every time it opens; returning visitors find their email already filled in
  useEffect(() => {
    if (!open) return;
    finished.current = false;
    setStep(firstStep);
    setCode("");
    setErr(null);
    setBusy(false);
    setPasskeyAdded(false);
    setPasskeys(backend.canUsePasskeys());
    try {
      setEmail(localStorage.getItem(LAST_EMAIL_KEY) ?? "");
    } catch {
      /* ignore */
    }
    if (firstStep === "welcome" && user) setName(user.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (open && step === "code") codeRef.current?.focus();
  }, [open, step]);

  // Passkey autofill: while the email box is showing, a saved passkey is offered right in it.
  useEffect(() => {
    if (!open || step !== "start" || !passkeys) return;
    let alive = true;
    const ctl = new AbortController();
    autofill.current = ctl;
    (async () => {
      const pk = window.PublicKeyCredential as unknown as { isConditionalMediationAvailable?: () => Promise<boolean> };
      if (!(await pk?.isConditionalMediationAvailable?.().catch(() => false))) return;
      try {
        const u = await backend.signInWithPasskey({ conditional: true, signal: ctl.signal });
        if (alive && u) finish(u, "passkey");
      } catch {
        /* closed, timed out, or replaced: the form still works */
      }
    })();
    return () => {
      alive = false;
      ctl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, passkeys]);

  // they tapped the link in the email (another tab signed in): carry on here too
  useEffect(() => {
    if (open && step === "code" && user) finish(user, "email_link");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, user?.id]);

  function finish(u: User, method: string) {
    if (finished.current) return;
    finished.current = true;
    onSignedIn(u);
    track(u.isNew ? "sign_up" : "login", { method });
    if (u.needsName && !u.fullName) {
      setName(u.name);
      setStep("welcome");
      return;
    }
    toast(u.isNew ? `Welcome to the neighborhood, ${stop(u.name)}` : `Welcome back, ${stop(u.name)}`, "ok");
    onClose();
  }

  function close() {
    // leaving the welcome step keeps the name we suggested, so we never ask again
    if (step === "welcome" && user?.needsName) backend.updateName(name.trim() || user.name).catch(() => {});
    onClose();
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    autofill.current?.abort();
    try {
      const r = await backend.sendCode(email);
      try {
        localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
      } catch {
        /* ignore */
      }
      if (r.instant) return finish(r.instant, "email");
      setCode("");
      setStep("code");
      setCooldown(RESEND_AFTER);
    } catch (e) {
      setErr(message(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify(c: string) {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      finish(await backend.verifyCode(email, c), "email");
    } catch (e) {
      setErr(message(e));
      // keep what they typed, selected, so a retype replaces it
      setTimeout(() => codeRef.current?.select(), 0);
    } finally {
      setBusy(false);
    }
  }

  async function google(idToken: string, nonce: string) {
    setErr(null);
    try {
      finish(await backend.signInWithGoogleToken(idToken, nonce), "google");
    } catch (e) {
      setErr(message(e));
    }
  }

  async function passkey() {
    setErr(null);
    autofill.current?.abort();
    try {
      const u = await backend.signInWithPasskey();
      if (u) finish(u, "passkey");
    } catch (e) {
      if (!cancelled(e)) setErr("That passkey didn't work here. Use your email instead — it only takes a code.");
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return onClose();
    setBusy(true);
    try {
      const u = await backend.updateName(name.trim() || user.name);
      toast(`Welcome to the neighborhood, ${stop(u.name)}`, "ok");
      onClose();
    } catch (e) {
      setErr(message(e));
    } finally {
      setBusy(false);
    }
  }

  async function addPasskey() {
    setErr(null);
    try {
      await backend.registerPasskey();
      setPasskeyAdded(true);
      track("passkey_added");
    } catch (e) {
      if (!cancelled(e)) setErr(message(e));
    }
  }

  const here = typeof window === "undefined" ? "/" : location.pathname + location.search;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={close}>
          <motion.div
            className="modal auth"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            initial={{ y: 30, rotate: -1.5, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="modal-x" onClick={close} aria-label="Close">
              ×
            </button>

            <AnimatePresence mode="wait" initial={false}>
              {step === "start" && (
                <motion.div key="start" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <h2 className="modal-title" id="auth-title">
                    Sign in or join
                  </h2>
                  <p className="muted">{reason ?? "Stamp your Plate Passport, save places to try, spin Surprise me, write reviews and post photos. Free, and no password."}</p>

                  {backend.googleClientId && (
                    <>
                      <GoogleButton clientId={backend.googleClientId} onToken={google} onFallback={() => backend.signInWithGoogleRedirect(here).catch((e) => setErr(message(e)))} />
                      <p className="auth-or">
                        <span>or</span>
                      </p>
                    </>
                  )}

                  <form onSubmit={send} className="form" noValidate>
                    <label>
                      <span>Email</span>
                      <input
                        type="email"
                        inputMode="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                        autoCapitalize="off"
                        spellCheck={false}
                        enterKeyHint="go"
                        autoComplete={passkeys ? "username webauthn" : "email"}
                      />
                    </label>
                    {err && (
                      <p className="form-err" role="alert">
                        {err}
                      </p>
                    )}
                    <button className="btn btn-green btn-block" disabled={busy || !email.trim()}>
                      {busy ? "One sec…" : "Continue with email"}
                    </button>
                  </form>

                  {passkeys && (
                    <button type="button" className="textbtn auth-passkey" onClick={passkey}>
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                        <circle cx="9" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M2.5 20c.6-3.4 3.3-5.5 6.5-5.5 1.3 0 2.5.3 3.5 1M17 11.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 5V21m0-2h2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      Sign in with a passkey
                    </button>
                  )}

                  <p className="fine auth-fine">
                    {backend.mode === "local" ? (
                      <>Preview mode: your account and everything you save stay on this device.</>
                    ) : (
                      <>
                        New here or coming back, it&apos;s the same: we email you a code. No password to remember.{" "}
                        <Link href="/privacy">Privacy</Link>
                      </>
                    )}
                  </p>
                </motion.div>
              )}

              {step === "code" && (
                <motion.div key="code" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                  <h2 className="modal-title" id="auth-title">
                    Check your email
                  </h2>
                  <p className="muted">
                    We sent a {CODE_LEN}-digit code to <strong>{email.trim()}</strong>.{" "}
                    <button type="button" className="textbtn" onClick={() => (setStep("start"), setErr(null))}>
                      Change
                    </button>
                  </p>
                  <form
                    className="form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (code.length >= 6) verify(code);
                    }}
                  >
                    <input
                      ref={codeRef}
                      className="code-input"
                      aria-label="Sign-in code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      maxLength={10}
                      placeholder={"•".repeat(CODE_LEN)}
                      value={code}
                      disabled={busy}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setCode(v);
                        if (v.length === CODE_LEN) verify(v);
                      }}
                    />
                    {err && (
                      <p className="form-err" role="alert">
                        {err}
                      </p>
                    )}
                    <button className="btn btn-green btn-block" disabled={busy || code.length < 6}>
                      {busy ? "Checking…" : "Sign in"}
                    </button>
                  </form>
                  <p className="fine auth-fine">
                    Or tap the link in that email — either one signs you in.{" "}
                    {cooldown > 0 ? (
                      <span className="auth-wait">
                        New code in {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, "0")}
                      </span>
                    ) : (
                      <button type="button" className="textbtn" onClick={() => send()} disabled={busy}>
                        Send a new code
                      </button>
                    )}
                  </p>
                  <p className="fine auth-fine">Nothing there? Check spam or Promotions for “The Plate Next Door”.</p>
                </motion.div>
              )}

              {step === "welcome" && (
                <motion.div key="welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <h2 className="modal-title" id="auth-title">
                    You&apos;re in.
                  </h2>
                  <p className="muted">What should we call you? It&apos;s how your reviews and photos are signed. You can change it anytime.</p>
                  <form onSubmit={saveName} className="form">
                    <label>
                      <span>Your name</span>
                      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus autoComplete="given-name" enterKeyHint="done" />
                    </label>
                    {err && (
                      <p className="form-err" role="alert">
                        {err}
                      </p>
                    )}
                    <button className="btn btn-green btn-block" disabled={busy}>
                      {busy ? "One sec…" : "Looks good"}
                    </button>
                  </form>
                  {passkeys &&
                    (passkeyAdded ? (
                      <p className="fine auth-fine auth-ok">Passkey saved. Next time, sign in with Face ID, your fingerprint or your device PIN.</p>
                    ) : (
                      <button type="button" className="btn btn-line btn-block auth-passkey-add" onClick={addPasskey}>
                        Use Face ID or fingerprint next time
                      </button>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
