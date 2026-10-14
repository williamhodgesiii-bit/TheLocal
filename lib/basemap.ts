import L from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import { MAP_STYLES } from "./map-styles";

/**
 * The map background. Free, no key, no account: OpenFreeMap vector tiles
 * (https://openfreemap.org, OpenStreetMap data, commercial use allowed), drawn with
 * MapLibre inside Leaflet. Vector tiles are drawn fresh at every zoom, so the map stays
 * sharp however far you zoom in. If the device can't draw vector maps (no WebGL) or the
 * style can't be fetched, it falls back to OpenStreetMap's own raster tiles.
 *
 * NEXT_PUBLIC_MAP_TILES (a raster {z}/{x}/{y} URL) overrides all of this.
 */
const RASTER = process.env.NEXT_PUBLIC_MAP_TILES;
const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const OFM_CREDIT = `<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> ${OSM_CREDIT}`;
// the main map prints its own neighborhood names, so the base map's place names and POIs go
const HIDDEN_ON_PRINT = /^(place|poi|airport|aerodrome|water_name|housenumber|mountain_peak)/;

function webgl() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// One fetch per style per page. The layout preloads the main style as soon as the page
// opens, so by the time the map code arrives it is usually already downloaded.
type Style = { layers: { id: string }[] };
const styles = new Map<string, Promise<Style>>();
function getStyle(url: string) {
  if (!styles.has(url))
    styles.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`style ${r.status}`);
        return r.json() as Promise<Style>;
      })
    );
  return styles.get(url)!;
}

export function addBasemap(map: L.Map, kind: keyof typeof MAP_STYLES) {
  const raster = () => L.tileLayer(RASTER || OSM, { maxZoom: 19, attribution: OSM_CREDIT }).addTo(map);
  if (RASTER || !webgl()) return void raster();

  let gone = false;
  map.once("unload", () => (gone = true));
  getStyle(MAP_STYLES[kind])
    .then((style) => {
      if (gone) return;
      // drop what we'd hide anyway before MapLibre parses it: less work, faster first draw
      const trimmed = kind === "print" ? { ...style, layers: style.layers.filter((l) => !HIDDEN_ON_PRINT.test(l.id)) } : style;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (L as any)
        .maplibreGL({
          style: trimmed,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0, // labels appear at once instead of fading in
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2), // retina-sharp without drawing 9x the pixels on 3x phones
        })
        .addTo(map);
      // the GL layer doesn't report its credit to Leaflet, so add it by hand
      map.attributionControl?.addAttribution(OFM_CREDIT);
    })
    .catch(() => {
      if (!gone) raster();
    });
}
