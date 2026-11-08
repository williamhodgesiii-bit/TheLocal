/**
 * After a deploy, a phone that already had the site open is still running the old version. The
 * first time it needs a piece it hasn't loaded yet (comments, the Friends tab, a photo viewer), it
 * asks for a file the new deploy replaced, and the page would crash. Instead we reload once and
 * the new version comes up. A guard stops it from reloading in a loop if the site is really down.
 */
const STALE = /ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed|dynamically imported module|Importing a module script failed|module script failed/i;
const KEY = "tl.reloadedForUpdate";

export function isStaleBuild(e: unknown): boolean {
  if (!e) return false;
  const x = e as { name?: unknown; message?: unknown };
  return STALE.test(`${String(x.name ?? "")} ${String(x.message ?? e)}`);
}

/** reload to pick up the new version; false when we just did, so a real outage can't loop */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 20_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* private mode: reload anyway */
  }
  location.reload();
  return true;
}

/** tell the server what broke (it lands in the Vercel logs), so a crash can be fixed, not guessed at */
export function reportCrash(e: unknown, where: string) {
  try {
    const x = e as { name?: string; message?: string; stack?: string; digest?: string };
    const body = JSON.stringify({
      where,
      name: x?.name,
      message: String(x?.message ?? e).slice(0, 500),
      stack: String(x?.stack ?? "").slice(0, 2000),
      digest: x?.digest,
      url: location.pathname + location.search,
      ua: navigator.userAgent.slice(0, 200),
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
    else fetch("/api/client-error", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    /* never let reporting break anything */
  }
}
