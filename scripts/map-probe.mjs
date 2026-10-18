// Temporary, read-only: does the live site show a Google button or passkeys, and does the
// sign-in link page load? (Supabase has Google and passkeys switched off.)
import { mkdir, writeFile } from "node:fs/promises";
const site = "https://www.theplatenextdoor.com";
const out = { google: false, gsi: false, passkeyCalls: false, callback: null, apex: null };
const pages = ["/", "/auth/callback", "/spot/the-battery"];
const seen = new Set();
for (const p of pages) {
  const r = await fetch(site + p);
  if (p === "/auth/callback") out.callback = r.status;
  const html = await r.text();
  for (const c of [...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0])) {
    if (seen.has(c)) continue;
    seen.add(c);
    const js = await (await fetch(new URL(c, site))).text();
    if (/[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com/.test(js)) out.google = true;
    if (js.includes("accounts.google.com/gsi")) out.gsi = true;
    if (/signInWithPasskey|webauthn/.test(js) && /"on"\s*===\s*"on"|!0&&"undefined"!=typeof window&&"PublicKeyCredential"in window/.test(js)) out.passkeyCalls = true;
  }
}
const a = await fetch("https://theplatenextdoor.com", { redirect: "manual" });
out.apex = { status: a.status, to: a.headers.get("location") };
out.chunks = seen.size;
await mkdir("probe", { recursive: true });
await writeFile("probe/commons.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
