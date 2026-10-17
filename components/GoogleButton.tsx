"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Continue with Google" using Google Identity Services: the official button plus the One Tap
 * prompt (FedCM in Chrome), which signs a person in with the Google account already on their
 * phone or laptop in one tap. A nonce ties each Google token to this one attempt: Google gets
 * its SHA-256, Supabase gets the original to check against. If Google's script can't load
 * (blocked, offline), it falls back to the regular redirect sign-in.
 */
type GisId = {
  initialize(config: Record<string, unknown>): void;
  renderButton(el: HTMLElement, options: Record<string, unknown>): void;
  prompt(): void;
  cancel(): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GisId } };
  }
}

let loader: Promise<void> | null = null;
function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  loader ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error("Google sign-in didn't load"));
    };
    document.head.appendChild(s);
  });
  return loader;
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function GoogleButton({
  clientId,
  onToken,
  onFallback,
  oneTap = true,
}: {
  clientId: string;
  onToken: (idToken: string, nonce: string) => void;
  onFallback: () => void;
  oneTap?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadGis();
        const el = ref.current;
        const gis = window.google?.accounts.id;
        if (!alive || !el || !gis) return;
        const raw = crypto.randomUUID ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Date.now()}`;
        const nonce = await sha256Hex(raw);
        if (!alive) return;
        gis.initialize({
          client_id: clientId,
          nonce,
          callback: (r: { credential?: string }) => r.credential && cb.current(r.credential, raw),
          use_fedcm_for_prompt: true,
          itp_support: true,
          context: "signin",
          ux_mode: "popup",
          cancel_on_tap_outside: true,
        });
        const width = Math.max(200, Math.min(400, Math.round(el.getBoundingClientRect().width || 320)));
        gis.renderButton(el, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "pill", logo_alignment: "center", width: String(width) });
        if (oneTap) gis.prompt();
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      // close only the One Tap prompt this button opened; one without a prompt mustn't close another's
      if (!oneTap) return;
      try {
        window.google?.accounts.id.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [clientId, oneTap]);

  if (failed)
    return (
      <button type="button" className="btn btn-line btn-block g-fallback" onClick={onFallback}>
        <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17z" />
          <path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.8 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
        </svg>{" "}
        Continue with Google
      </button>
    );
  return <div ref={ref} className="g-btn" />;
}
