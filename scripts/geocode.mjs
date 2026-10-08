// Refines map pins using Google Places (New) Text Search.
// Usage: GOOGLE_PLACES_API_KEY=xxx npm run geocode
// Writes lib/geo-overrides.json ({ spotId: [lat, lng] }), which lib/data.ts merges at build time.
import { readFileSync, writeFileSync } from "node:fs";

const key = process.env.GOOGLE_PLACES_API_KEY;
if (!key) {
  console.error("Set GOOGLE_PLACES_API_KEY first.");
  process.exit(1);
}

const src = readFileSync(new URL("../lib/data.ts", import.meta.url), "utf8");
const spots = [...src.matchAll(/id: "([^"]+)", name: "([^"]+)"[\s\S]*?address: "([^"]+)"/g)].map((m) => ({
  id: m[1],
  name: m[2],
  address: m[3],
}));

const out = {};
for (const s of spots) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.displayName,places.location,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: `${s.name}, ${s.address}, Birmingham, AL`, maxResultCount: 1 }),
  });
  const json = await res.json();
  const p = json.places?.[0];
  if (p?.location) {
    out[s.id] = [+p.location.latitude.toFixed(5), +p.location.longitude.toFixed(5)];
    console.log(`✓ ${s.name} → ${p.formattedAddress}`);
  } else {
    console.log(`✗ ${s.name} (no match)`);
  }
}
writeFileSync(new URL("../lib/geo-overrides.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`\nWrote ${Object.keys(out).length} overrides.`);
