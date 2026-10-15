import type { StyleSpecification } from "maplibre-gl";
import { MAP_STYLES } from "./map-styles";
import { MAP_INK, printStyle } from "./map-style-print";

/**
 * Loading the map's look. Free, no key, no account: OpenFreeMap vector tiles
 * (https://openfreemap.org, OpenStreetMap data, commercial use allowed). If that style
 * can't be fetched, or its tiles never arrive, the map switches to OpenStreetMap's own
 * raster tiles so it is never blank.
 */
export const OSM_TILES = process.env.NEXT_PUBLIC_MAP_TILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';
export const OFM_CREDIT = `<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> ${OSM_CREDIT}`;

// the main map prints its own neighborhood names, so the base map's place names and POIs go
const HIDDEN_ON_PRINT = /^(place|poi|airport|aerodrome|water_name|housenumber|mountain_peak)/;

export type Style = StyleSpecification;

/** The paper color the map sits on while (or if) tiles load: the map's own land color. */
export const PAPER = MAP_INK.land;

export const BLANK_STYLE: Style = { version: 8, sources: {}, layers: [{ id: "paper", type: "background", paint: { "background-color": PAPER } }] };

export const RASTER_STYLE: Style = {
  version: 8,
  sources: { osm: { type: "raster", tiles: [OSM_TILES], tileSize: 256, maxzoom: 19 } },
  layers: [
    { id: "paper", type: "background", paint: { "background-color": PAPER } },
    { id: "osm", type: "raster", source: "osm" },
  ],
};

export function webgl() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// One fetch per style per page. The layout preloads the main style as soon as the page
// opens, so by the time the map code arrives it is usually already downloaded.
const cache = new Map<string, Promise<Style>>();
export function loadStyle(kind: keyof typeof MAP_STYLES): Promise<Style> {
  const url = MAP_STYLES[kind];
  if (!url) return Promise.resolve(printStyle(OFM_CREDIT)); // our own look: nothing to fetch but the tiles
  if (!cache.has(url)) {
    const p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`style ${r.status}`);
        return r.json() as Promise<Style>;
      })
      // drop what we'd hide anyway before MapLibre parses it: less work, faster first draw
      .then((s) => (kind === "print" ? { ...s, layers: s.layers.filter((l) => !HIDDEN_ON_PRINT.test(l.id)) } : s));
    p.catch(() => cache.delete(url)); // let a later visit try again
    cache.set(url, p);
  }
  return cache.get(url)!;
}
