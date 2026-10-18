// Temporary: find the live site's public Supabase project URL (it's in the client JavaScript).
import { mkdir, writeFile } from "node:fs/promises";
const out = { pages: {}, found: [] };
for (const base of ["https://www.theplatenextdoor.com", "https://theplatenextdoor.com", "https://the-local-ten.vercel.app"]) {
  try {
    const r = await fetch(base, { redirect: "follow" });
    const html = await r.text();
    out.pages[base] = { status: r.status, url: r.url, size: html.length };
    const chunks = [...new Set([...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]))];
    out.pages[base].chunks = chunks.length;
    for (const c of chunks) {
      const js = await (await fetch(new URL(c, r.url))).text();
      for (const m of js.matchAll(/https:\/\/[a-z0-9]{10,30}\.supabase\.co/g)) out.found.push(m[0]);
    }
    if (out.found.length) break;
  } catch (e) {
    out.pages[base] = { error: String(e) };
  }
}
out.found = [...new Set(out.found)];
await mkdir("probe", { recursive: true });
await writeFile("probe/commons.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
