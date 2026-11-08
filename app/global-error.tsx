"use client";

import { useEffect } from "react";
import { isStaleBuild, reloadForNewVersion, reportCrash } from "@/lib/recover";

/** The last line of defense, for errors above the page itself (it replaces the whole document). */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const stale = isStaleBuild(error);
  useEffect(() => {
    if (stale && reloadForNewVersion()) return;
    reportCrash(error, "global");
  }, [error, stale]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#F4EFE1", color: "#22201C", fontFamily: "Georgia, serif", textAlign: "center", padding: 24 }}>
        {!stale && (
          <div>
            <h1 style={{ fontWeight: 500, fontSize: 28, margin: "0 0 8px" }}>That didn&apos;t load right.</h1>
            <p style={{ margin: "0 0 20px", color: "#6C665A", fontFamily: "system-ui, sans-serif" }}>Sorry about that. Reloading usually fixes it.</p>
            <button
              type="button"
              onClick={() => location.reload()}
              style={{ padding: "12px 22px", border: 0, borderRadius: 999, background: "#22201C", color: "#FBF8F0", fontSize: 16, fontWeight: 600 }}
            >
              Reload
            </button>
            <p style={{ marginTop: 18, fontSize: 12, color: "#6C665A", fontFamily: "system-ui, sans-serif" }}>
              {error.name}: {error.message}
            </p>
          </div>
        )}
      </body>
    </html>
  );
}
