// Temporary: exact pins from OpenStreetMap for places the monthly lookup misses.
import { mkdir, writeFile } from "node:fs/promises";
const UA = "PlateNextDoor-maintenance/1.0 (https://github.com/williamhodgesiii-bit/thelocal)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) {
  for (let t = 0; t < 5; t++) {
    const r = await fetch(u, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
    const txt = await r.text();
    try { return JSON.parse(txt); } catch { await sleep(5000 * (t + 1)); }
  }
  return null;
}
const QS = {
  chubbfathers: ["Chubbfathers, Alabaster, Alabama", "Kent Stone Boulevard, Alabaster, Alabama", "229 Kent Stone Blvd, Alabaster, AL 35007"],
  "little-betty": ["Little Betty, Mountain Brook, Alabama", "Rele Street, Mountain Brook, Alabama", "Lane Parke, Mountain Brook, Alabama"],
  seabar: ["SeaBar, Mountain Brook, Alabama", "Jemison Lane, Mountain Brook, Alabama"],
  "charbar-no-7": ["CharBar No. 7, Mountain Brook, Alabama", "900 Jemison Ln, Mountain Brook, Alabama"],
  "locanda-brasato": ["270 Rele St, Mountain Brook, Alabama", "Locanda Brasato, Mountain Brook"],
  "miss-astrids": ["3160 Pipeline Rd, Vestavia Hills, Alabama", "Pipeline Road, Vestavia Hills, Alabama"],
  foodbar: ["FoodBar, Vestavia Hills, Alabama", "Heights Village, Vestavia Hills, Alabama"],
  "the-ridge": ["The Ridge Eat & Drink, Vestavia Hills", "Rocky Ridge Plaza, Vestavia Hills, Alabama", "3325 Rocky Ridge Plaza, Vestavia Hills, AL"],
  rojo: ["Rojo, Birmingham, Alabama", "2921 Highland Ave S, Birmingham, Alabama"],
  "freddys-wine-bar": ["2251 Highland Ave S, Birmingham, Alabama", "Freddy's Wine Bar, Birmingham"],
  "liberty-park": ["Liberty Park, Vestavia Hills, Alabama"],
  "irondale-downtown": ["Irondale, Alabama"],
  "hoover-city": ["Hoover, Alabama"],
  "alabaster-city": ["Alabaster, Alabama"],
};
const out = {};
for (const [id, qs] of Object.entries(QS)) {
  out[id] = [];
  for (const q of qs) {
    const p = new URLSearchParams({ format: "jsonv2", limit: "2", countrycodes: "us", q, addressdetails: "1" });
    const j = await getJSON(`https://nominatim.openstreetmap.org/search?${p}`);
    for (const h of j ?? []) out[id].push({ q, lat: +h.lat, lon: +h.lon, type: h.addresstype, name: h.display_name.slice(0, 100) });
    await sleep(1200);
  }
}
await mkdir("probe", { recursive: true });
await writeFile("probe/commons.json", JSON.stringify(out, null, 1));
console.log("done");
