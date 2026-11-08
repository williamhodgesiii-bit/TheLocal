"use client";

import { useEffect } from "react";
import { isStaleBuild, reloadForNewVersion, reportCrash } from "@/lib/recover";

/** When something on a page breaks: get the new version if that's the cause, otherwise say so kindly. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = isStaleBuild(error);
  useEffect(() => {
    if (stale && reloadForNewVersion()) return;
    reportCrash(error, "page");
  }, [error, stale]);
  if (stale) return <main className="crash" aria-busy="true" />;
  return (
    <main className="crash">
      <h1>That didn&apos;t load right.</h1>
      <p>Sorry about that. Try again, or head back home.</p>
      <p className="crash-btns">
        <button type="button" className="btn btn-ink" onClick={() => reset()}>
          Try again
        </button>
        <a className="btn btn-line" href="/">
          Home
        </a>
      </p>
      <details className="crash-details">
        <summary>Details</summary>
        <code>
          {error.name}: {error.message}
          {error.digest ? ` (${error.digest})` : ""}
        </code>
      </details>
    </main>
  );
}
