// Temporary: look up openly licensed Wikimedia Commons photos for dishes the site lacks.
import { mkdir, writeFile } from "node:fs/promises";
const Q = {
  wings: "buffalo chicken wings plate",
  wings2: "chicken wings sauce",
  doughnuts: "glazed doughnuts",
  doughnuts2: "doughnut shop donuts",
  pancakes: "pancakes stack syrup",
  falafel: "falafel plate hummus",
  shawarma: "shawarma plate",
  hibachi: "teppanyaki hibachi grill",
  chinese: "chinese food dishes table",
  "fried-rice": "chinese fried rice",
  biryani: "chicken biryani",
  naan: "naan butter chicken",
  sandwich: "deli sandwich sliced meat",
  cupcakes: "cupcakes bakery",
  "smoked-chicken": "smoked chicken barbecue white sauce",
  "pulled-pork": "pulled pork sandwich",
  pho: "pho bowl",
  wine: "red wine glass restaurant",
};
const out = {};
for (const [k, q] of Object.entries(Q)) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=14&gsrsearch=${encodeURIComponent("filetype:bitmap " + q)}&prop=imageinfo&iiprop=url|size|extmetadata&iiextmetadatafilter=LicenseShortName|Artist|UsageTerms|ImageDescription`;
  const r = await fetch(u, { headers: { "User-Agent": "PlateNextDoor-photo-check/1.0 (site maintenance)" } });
  const j = await r.json();
  out[k] = Object.values(j.query?.pages ?? {}).map((p) => {
    const ii = p.imageinfo?.[0] ?? {};
    const m = ii.extmetadata ?? {};
    const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
    return { file: p.title.replace(/^File:/, "").replace(/ /g, "_"), w: ii.width, h: ii.height, license: m.LicenseShortName?.value, artist: strip(m.Artist?.value), desc: strip(m.ImageDescription?.value) };
  });
  await new Promise((r) => setTimeout(r, 400));
}
await mkdir("probe", { recursive: true });
await writeFile("probe/commons.json", JSON.stringify(out, null, 1));
console.log("done");
