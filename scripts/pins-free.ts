// Exact map pins for free: looks every place up on OpenStreetMap (Nominatim), which needs
// no key and no card. Runs on GitHub Actions (.github/workflows/pins.yml) and saves the
// results to lib/geo-overrides.json, which the site reads at build time.
//
// Run by hand:  npx tsx scripts/pins-free.ts
//
// Nominatim's rules: one request a second, a real User-Agent, and cache the answers.
// This makes at most three requests per place, a second apart, about once a month.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AREA_BY_ID, SPOTS, TOWN_BY_ID, distanceKm, locationsOf } from "../lib/data";

const OUT = join(__dirname, "../lib/geo-overrides.json");
const UA = "ThePlateNextDoor/1.0 (+https://github.com/williamhodgesiii-bit/thelocal)";
// a pin only moves if OpenStreetMap's answer is this close to where we already had it
const MAX_MOVE_KM = 3;
// Birmingham metro, out to Alabaster and Bessemer, so a same-named street elsewhere in Alabama can't match
const VIEWBOX = "-87.10,33.65,-86.55,33.15";

const GAP_MS = Number(process.env.PINS_GAP_MS ?? 1100); // only lowered for local tests
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Hit = { lat: string; lon: string; display_name: string; category?: string; addresstype?: string };

async function search(params: Record<string, string>): Promise<Hit | null> {
  const q = new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "us", viewbox: VIEWBOX, bounded: "1", ...params });
  await sleep(GAP_MS);
  const r = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
  if (!r.ok) throw new Error(`Nominatim ${r.status}`);
  const j = (await r.json()) as Hit[];
  return j[0] ?? null;
}

async function main() {
  const pins: Record<string, [number, number]> = JSON.parse(readFileSync(OUT, "utf8"));
  let moved = 0;
  let kept = 0;

  // every location of every place: the main one under its id, the others as "id@2", "id@3"…
  const all = SPOTS.flatMap((p) => locationsOf(p).map((l, i) => ({ id: i ? `${p.id}@${i + 1}` : p.id, name: p.name, area: l.area, address: l.address, coords: l.coords })));
  for (const s of all) {
    const area = AREA_BY_ID[s.area];
    const city = area?.city ?? (area?.town ? TOWN_BY_ID[area.town].label : "Birmingham");
    const street = s.address.split(",")[0].trim();
    // 1) the business itself, if it's mapped  2) its street address  3) same address, mailing city Birmingham
    const tries: Record<string, string>[] = [
      { amenity: s.name, street, city, state: "Alabama" },
      { street, city, state: "Alabama" },
      ...(city !== "Birmingham" ? [{ street, city: "Birmingham", state: "Alabama" }] : []),
    ];
    let found: { at: [number, number]; how: string } | null = null;
    for (const t of tries) {
      try {
        const h = await search(t);
        if (!h) continue;
        const at: [number, number] = [+(+h.lat).toFixed(5), +(+h.lon).toFixed(5)];
        if (distanceKm(at, s.coords) > MAX_MOVE_KM) continue;
        found = { at, how: t.amenity ? "the business" : "the address" };
        break;
      } catch (e) {
        console.log(`  ! ${s.name}: ${(e as Error).message}`);
        await sleep(GAP_MS * 4);
      }
    }
    if (found) {
      pins[s.id] = found.at;
      moved++;
      console.log(`✓ ${s.name} (found ${found.how})`);
    } else {
      kept++;
      console.log(`– ${s.name}: no close match, pin stays where it was`);
    }
  }

  const sorted = Object.fromEntries(Object.keys(pins).sort().map((k) => [k, pins[k]]));
  writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`\n${moved} pins placed from OpenStreetMap, ${kept} left as they were.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
