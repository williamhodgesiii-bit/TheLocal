// Temporary: look up openly licensed Wikimedia Commons photos for dishes the site lacks.
import { mkdir, writeFile } from "node:fs/promises";
const Q = {
  "hot-dog": "hot dog chili onions",
  "fried-chicken": "fried chicken plate",
  ramen: "tonkotsu ramen bowl",
  catfish: "fried catfish plate",
  tiki: "mai tai cocktail",
  cookies: "decorated sugar cookies",
  concert: "concert crowd small club stage",
};
const out = {};
for (const [k, q] of Object.entries(Q)) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent("filetype:bitmap " + q)}&prop=imageinfo&iiprop=url|size|extmetadata&iiextmetadatafilter=LicenseShortName|Artist|UsageTerms|ImageDescription`;
  const r = await fetch(u, { headers: { "User-Agent": "PlateNextDoor-photo-check/1.0 (site maintenance)" } });
  const j = await r.json();
  out[k] = Object.values(j.query?.pages ?? {}).map((p) => {
    const ii = p.imageinfo?.[0] ?? {};
    const m = ii.extmetadata ?? {};
    const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
    return { file: p.title.replace(/^File:/, "").replace(/ /g, "_"), w: ii.width, h: ii.height, license: m.LicenseShortName?.value, artist: strip(m.Artist?.value), desc: strip(m.ImageDescription?.value) };
  });
}
await mkdir("probe", { recursive: true });
await writeFile("probe/commons.json", JSON.stringify(out, null, 1));
console.log("done");
