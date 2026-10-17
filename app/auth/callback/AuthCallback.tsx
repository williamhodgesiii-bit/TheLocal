"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBackend } from "@/lib/backend";
import { track } from "@/lib/analytics";

/** only our own pages, never an open redirect */
function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/auth/") ? raw : "/";
}

/** Where the link in the sign-in email (and Google's redirect fallback) lands. */
export default function AuthCallback() {
  const router = useRouter();
  const [state, setState] = useState<"working" | "failed">("working");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const h = new URLSearchParams(location.hash.slice(1));
    const next = safeNext(q.get("next"));
    const problem = q.get("error_description") || h.get("error_description");
    if (problem) {
      setDetail(/expired|invalid/i.test(problem) ? "That link has expired or was already used." : problem);
      setState("failed");
      return;
    }
    const backend = getBackend();
    let done = false;
    const go = (u: { isNew?: boolean } | null) => {
      if (done || !u) return;
      done = true;
      track(u.isNew ? "sign_up" : "login", { method: "email_link" });
      router.replace(next);
    };
    backend.getUser().then(go);
    const off = backend.onAuth(go);
    const t = setTimeout(() => {
      if (!done) {
        setDetail("That link has expired or was already used.");
        setState("failed");
      }
    }, 9000);
    return () => {
      off();
      clearTimeout(t);
    };
  }, [router]);

  return (
    <main className="guide auth-landing">
      <p className="cap-kicker">The Plate Next Door</p>
      {state === "working" ? (
        <>
          <h1 className="guide-h1">Signing you in…</h1>
          <p className="guide-lede">One second and you&apos;re back where you were.</p>
        </>
      ) : (
        <>
          <h1 className="guide-h1">Let&apos;s try that again</h1>
          <p className="guide-lede">{detail} Sign-in links and codes work once, for an hour. Head back and we&apos;ll send a fresh one.</p>
          <p>
            <Link href="/" className="btn btn-green">
              Back to the map
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
