// Temporary, read-only: is sign-up email ready? DNS for the Resend domain, and Supabase's
// public sign-in settings (via the site's own publishable key; the key is never saved).
import { mkdir, writeFile } from "node:fs/promises";
const SB = "https://wylpbzopmpqaahtbkvkn.supabase.co";
const out = { dns: {}, auth: null };
const q = async (name, type) => {
  const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`);
  const j = await r.json();
  return (j.Answer ?? []).map((a) => `${a.type === 15 ? "MX" : a.type === 16 ? "TXT" : a.type === 5 ? "CNAME" : a.type} ${a.data}`);
};
const D = "theplatenextdoor.com";
for (const [n, t] of [[D, "MX"], [D, "TXT"], [`send.${D}`, "MX"], [`send.${D}`, "TXT"], [`resend._domainkey.${D}`, "TXT"], [`_dmarc.${D}`, "TXT"], [`www.${D}`, "CNAME"]]) {
  out.dns[`${n} ${t}`] = await q(n, t);
}
const site = `https://www.${D}`;
const html = await (await fetch(site)).text();
let key = null;
for (const c of [...new Set([...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]))]) {
  const js = await (await fetch(new URL(c, site))).text();
  if (!js.includes("wylpbzopmpqaahtbkvkn")) continue;
  key = js.match(/sb_publishable_[A-Za-z0-9_-]{20,}/)?.[0] ?? js.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/)?.[0] ?? null;
  if (key) break;
}
if (key) {
  const r = await fetch(`${SB}/auth/v1/settings`, { headers: { apikey: key } });
  out.auth = { status: r.status, body: await r.json().catch(() => null) };
  const h = await fetch(`${site}/api/health`);
  out.health = { status: h.status, body: (await h.text()).slice(0, 400) };
}
await mkdir("probe", { recursive: true });
await writeFile("probe/commons.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
