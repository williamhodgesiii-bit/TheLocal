// One-time setup with a Google key: snaps every pin to the real location and stores each
// place's Google Place ID, so the site can fetch real photos without searching every time.
// Usage: GOOGLE_PLACES_API_KEY=xxx npm run geocode
// Writes lib/geo-overrides.json ({ id: [lat, lng] }) and lib/place-ids.json ({ id: "places/…" }).
import { readFileSync, writeFileSync } from "node:fs";

const key = process.env.GOOGLE_PLACES_API_KEY;
if (!key) {
  console.error("Set GOOGLE_PLACES_API_KEY first.");
  process.exit(1);
}

const src = readFileSync(new URL("../lib/data.ts", import.meta.url), "utf8");
const spots = [...src.matchAll(/id: "([^"]+)", name: "([^"]+)"[\s\S]*?address: "([^"]+)"/g)].map((m) => ({ id: m[1], name: m[2], address: m[3] }));

const coords = {};
const ids = {};
for (const s of spots) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.formattedAddress,places.businessStatus",
    },
    body: JSON.stringify({ textQuery: `${s.name}, ${s.address}, AL`, maxResultCount: 1 }),
  });
  const p = (await res.json()).places?.[0];
  if (p?.location) {
    coords[s.id] = [+p.location.latitude.toFixed(5), +p.location.longitude.toFixed(5)];
    ids[s.id] = p.id;
    const flag = p.businessStatus && p.businessStatus !== "OPERATIONAL" ? `  <-- ${p.businessStatus}` : "";
    console.log(`✓ ${s.name} → ${p.formattedAddress}${flag}`);
  } else {
    console.log(`✗ ${s.name} (no match)`);
  }
}
writeFileSync(new URL("../lib/geo-overrides.json", import.meta.url), JSON.stringify(coords, null, 2) + "\n");
writeFileSync(new URL("../lib/place-ids.json", import.meta.url), JSON.stringify(ids, null, 2) + "\n");
console.log(`\nWrote ${Object.keys(coords).length} locations. Anything marked CLOSED should come off the list.`);
