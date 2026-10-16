// Temporary: photo previews from Wikimedia Commons and exact pins from OpenStreetMap for new places.
import { mkdir, writeFile } from "node:fs/promises";
const UA = "PlateNextDoor-maintenance/1.0 (https://github.com/williamhodgesiii-bit/thelocal)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir("probe/thumbs", { recursive: true });
const out = { search: {}, thumbs: {}, geo: {} };

async function getJSON(u) {
  for (let t = 0; t < 6; t++) {
    const r = await fetch(u, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
    const txt = await r.text();
    try { return JSON.parse(txt); } catch { await sleep(5000 * (t + 1)); }
  }
  return null;
}

// 1) a few more dish searches
const Q = { cheesesteak: "philly cheesesteak sandwich", sub: "italian sub sandwich hoagie", hibachi: "teppanyaki chef grill", tandoori: "tandoori chicken plate", smash: "smash burger" };
for (const [k, q] of Object.entries(Q)) {
  const j = await getJSON(`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent("filetype:bitmap " + q)}&prop=imageinfo&iiprop=size|extmetadata&iiextmetadatafilter=LicenseShortName|Artist|ImageDescription`);
  const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
  out.search[k] = Object.values(j?.query?.pages ?? {}).map((p) => {
    const ii = p.imageinfo?.[0] ?? {}; const m = ii.extmetadata ?? {};
    return { file: p.title.replace(/^File:/, "").replace(/ /g, "_"), w: ii.width, h: ii.height, license: m.LicenseShortName?.value, artist: strip(m.Artist?.value), desc: strip(m.ImageDescription?.value) };
  });
  await sleep(2500);
}

// 2) small previews to look at before choosing
const THUMBS = [
  "Chicken_wings_at_West_Side_Story_in_February_2025.jpg", "Sriracha_chicken_wings_(10832723804).jpg", "A_box_of_chicken_wings_and_sauces_(49456308206).jpg",
  "Glazed_Ring_Doughnuts.jpg", "Donuts_(cropped).jpg", "Glazed_doughnut_(1387333).jpg",
  "Pancakes_with_Berries_(Unsplash).jpg", "2019-04-21_11_41_12_A_stack_of_blueberry_pancakes_with_syrup_in_the_Franklin_Farm_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg",
  "Mixed_Plate_(3186676853).jpg", "Loaded_Shawarma.jpg", "MyPlate_gov_Cultural_Food_(20241025-USDA-FNS-UNK-0017).jpg",
  "Chinese_food_dishes.jpg", "Chinese_Food.jpg", "House_special_fried_rice_(516570766).jpg",
  "Butter_chicken_med_raita_og_naan_(5158340847).jpg", "Butter_Chicken_with_Garlic_Naan.jpg", "Chicken_Hyderabadi_Biryani.JPG",
  "Pulled_pork_sandwich.jpg", "B.B.Q._Pulled_Pork_Sandwich.jpg", "Butter_Cream_Bakery_cupcakes_-_February_2024_-_Sarah_Stierch.jpg",
];
for (const f of THUMBS) {
  try {
    const r = await fetch(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=330`, { headers: { "User-Agent": UA } });
    const buf = Buffer.from(await r.arrayBuffer());
    const name = f.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 60) + ".jpg";
    if (r.ok) await writeFile(`probe/thumbs/${name}`, buf);
    out.thumbs[f] = r.ok ? name : r.status;
  } catch (e) { out.thumbs[f] = String(e); }
  await sleep(1500);
}

// 3) pins
const GEO = {
  "taj-india": ["3120 Clairmont Ave S", "Birmingham"],
  "hello-bakery": ["1109 Dunston Ave", "Birmingham"],
  "red-pearl": ["243 W Valley Ave", "Homewood"],
  shiki: ["300 19th St S", "Homewood"],
  "full-circle": ["1726 28th Ave S", "Homewood"],
  "the-battery": ["2821 Central Ave", "Homewood"],
  "whiskey-foxtrot": ["1919 28th Ave S", "Homewood"],
  "taco-mama-homewood": ["1014 Oxmoor Rd", "Homewood"],
  "curry-corner": ["2037 Cahaba Rd", "Mountain Brook"],
  porch: ["2 Dexter Ave", "Mountain Brook"],
  "taco-mama-crestline": ["63 Church St", "Mountain Brook"],
  "cala-cahaba": ["3950 Autumn Ln", "Vestavia Hills"],
  "on-tap": ["11967 Liberty Pkwy", "Vestavia Hills"],
  chubbfathers: ["229 Kent Stone Blvd", "Alabaster"],
  "jj-grocery": ["8169 Dickey Springs Rd", "Bessemer"],
  "mr-ps": ["813 Shades Crest Rd", "Hoover"],
  archies: ["1571 Montgomery Hwy", "Hoover"],
  "golden-rule": ["2504 Crestwood Blvd", "Irondale"],
  "martys-gm": ["5415 Beacon Dr", "Irondale"],
  creekside: ["1020 Oak Mountain Park Rd", "Pelham"],
  carliles: ["3511 6th Ave S", "Birmingham"],
  ampersandwich: ["4124 3rd Ave S", "Birmingham"],
  "high-dive": ["524 32nd St S", "Birmingham"],
  "son-of-a-butcher": ["2810 3rd Ave S", "Birmingham"],
  dreamland: ["1427 14th Ave S", "Birmingham"],
  "jim-n-nicks": ["1908 11th Ave S", "Birmingham"],
  "t-bones": ["1017 20th St S", "Birmingham"],
  "armour-house": ["2309 1st Ave N", "Birmingham"],
  "le-fresca": ["2218 2nd Ave N", "Birmingham"],
  "pizitz": ["1801 1st Ave N", "Birmingham"],
  makarios: ["940 20th St S", "Birmingham"],
  "falafel-cafe": ["401 19th St S", "Birmingham"],
  "cafe-dupont": ["113 20th St N", "Birmingham"],
  blueprint: ["3000 3rd Ave S", "Birmingham"],
  "mexico-lindo": ["350 Hollywood Blvd", "Homewood"],
  "hamburger-heaven": ["180 Oxmoor Blvd", "Homewood"],
  "mr-chens": ["808 Green Springs Hwy", "Homewood"],
  "oak-hill": ["2835 18th St S", "Homewood"],
  general: ["3813 Clairmont Ave S", "Birmingham"],
  eastwest: ["2306 2nd Ave N", "Birmingham"],
};
for (const [id, [street, city]] of Object.entries(GEO)) {
  const q = new URLSearchParams({ format: "jsonv2", limit: "3", countrycodes: "us", street, city, state: "Alabama", addressdetails: "1" });
  const j = await getJSON(`https://nominatim.openstreetmap.org/search?${q}`);
  out.geo[id] = (j ?? []).map((h) => ({ lat: +h.lat, lon: +h.lon, type: h.addresstype, name: h.display_name.slice(0, 110), city: h.address?.city ?? h.address?.town ?? h.address?.village, hood: h.address?.neighbourhood ?? h.address?.suburb }));
  await sleep(1200);
}
await writeFile("probe/commons.json", JSON.stringify(out, null, 1));
console.log("done");
