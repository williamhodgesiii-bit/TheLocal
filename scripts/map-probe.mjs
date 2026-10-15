// Temporary: download OpenFreeMap styles, Birmingham tiles and fonts so the map style can be
// designed and checked offline. Lives on the throwaway map-probe branch only.
import { mkdir, writeFile } from "node:fs/promises";
const out = "probe";
await mkdir(`${out}/tiles`, { recursive: true });
const get = async (u) => {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u).catch(() => null);
    if (r?.ok) return Buffer.from(await r.arrayBuffer());
    if (r && r.status === 404) return null;
    await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
  }
  throw new Error("failed " + u);
};
const styles = {};
for (const s of ["positron", "liberty", "bright"]) {
  const buf = await get(`https://tiles.openfreemap.org/styles/${s}`);
  await writeFile(`${out}/${s}.json`, buf);
  styles[s] = JSON.parse(buf.toString());
}
const tj = JSON.parse((await get("https://tiles.openfreemap.org/planet")).toString());
await writeFile(`${out}/planet.json`, JSON.stringify(tj, null, 1));
const tpl = tj.tiles[0];
const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) => Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
const bbox = [-86.92, 33.37, -86.66, 33.59];
let n = 0;
for (let z = 8; z <= 14; z++)
  for (let x = lon2x(bbox[0], z); x <= lon2x(bbox[2], z); x++)
    for (let y = lat2y(bbox[3], z); y <= lat2y(bbox[1], z); y++) {
      const buf = await get(tpl.replace("{z}", z).replace("{x}", x).replace("{y}", y));
      if (!buf) continue;
      await mkdir(`${out}/tiles/${z}/${x}`, { recursive: true });
      await writeFile(`${out}/tiles/${z}/${x}/${y}.pbf`, buf);
      n++;
    }
console.log("tiles", n);
// fonts every style uses, for the ranges English street names need
const fonts = new Set();
const walk = (v) => (Array.isArray(v) ? (v.every((x) => typeof x === "string") && v.length && /Noto|Open|Sans|Serif|Regular|Bold|Italic/.test(v[0]) ? fonts.add(v.join(",")) : v.forEach(walk)) : null);
for (const s of Object.values(styles)) for (const l of s.layers) if (l.layout?.["text-font"]) walk(l.layout["text-font"]);
const glyphs = styles.liberty.glyphs;
for (const f of fonts)
  for (const r of ["0-255", "256-511", "8192-8447"]) {
    const buf = await get(glyphs.replace("{fontstack}", encodeURIComponent(f)).replace("{range}", r));
    if (!buf) continue;
    await mkdir(`${out}/fonts/${f}`, { recursive: true });
    await writeFile(`${out}/fonts/${f}/${r}.pbf`, buf);
  }
console.log("fonts", [...fonts], glyphs);
// liberty's icons, for comparison renders
if (styles.liberty.sprite) {
  const sp = typeof styles.liberty.sprite === "string" ? styles.liberty.sprite : styles.liberty.sprite[0].url;
  for (const ext of [".json", ".png", "@2x.json", "@2x.png"]) {
    const buf = await get(sp + ext);
    if (buf) await writeFile(`${out}/sprite${ext}`, buf);
  }
}
