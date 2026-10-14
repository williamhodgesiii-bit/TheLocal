import L from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";

/**
 * The map background. Free, no key, no account: OpenFreeMap vector tiles
 * (https://openfreemap.org, OpenStreetMap data, commercial use allowed), drawn with
 * MapLibre inside Leaflet. If the device can't draw vector maps (no WebGL) or the
 * style fails to load, it falls back to OpenStreetMap's own raster tiles.
 *
 * NEXT_PUBLIC_MAP_TILES (a raster {z}/{x}/{y} URL) overrides all of this.
 */
const RASTER = process.env.NEXT_PUBLIC_MAP_TILES;
const STYLES = {
  // quiet gray base for the main map; our own neighborhood names sit on top
  print: process.env.NEXT_PUBLIC_MAP_STYLE || "https://tiles.openfreemap.org/styles/positron",
  // more detail (shops, house numbers) for dropping a pin on a front door
  detail: "https://tiles.openfreemap.org/styles/liberty",
};
const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const OFM_CREDIT = `<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> ${OSM_CREDIT}`;

function webgl() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function addBasemap(map: L.Map, kind: keyof typeof STYLES) {
  const raster = (url: string, credit: string) => L.tileLayer(url, { maxZoom: 19, attribution: credit }).addTo(map);
  if (RASTER) return raster(RASTER, OSM_CREDIT);
  if (!webgl()) return raster(OSM, OSM_CREDIT);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gl = (L as any).maplibreGL({ style: STYLES[kind], interactive: false }).addTo(map);
  // the GL layer doesn't report its credit to Leaflet, so add it by hand
  map.attributionControl?.addAttribution(OFM_CREDIT);
  const ml = gl.getMaplibreMap?.();
  let fellBack = false;
  const fallBack = () => {
    if (fellBack) return;
    fellBack = true;
    try {
      map.removeLayer(gl);
      map.attributionControl?.removeAttribution(OFM_CREDIT);
      raster(OSM, OSM_CREDIT);
    } catch {
      /* the map was closed in the meantime */
    }
  };
  if (!ml) return gl;
  // style never arrives (blocked, offline): switch to plain tiles instead of a blank map
  const timer = setTimeout(() => !ml.isStyleLoaded() && fallBack(), 8000);
  ml.on("error", (e: { error?: { status?: number; url?: string } }) => {
    if (!ml.isStyleLoaded() && e?.error?.url?.includes("/styles/")) fallBack();
  });
  ml.once("load", () => {
    clearTimeout(timer);
    if (kind !== "print") return;
    // the main map prints its own neighborhood names; drop the base map's place names and POIs
    for (const layer of ml.getStyle().layers ?? []) {
      if (/^(place|poi|airport|aerodrome|water_name|housenumber)/.test(layer.id)) ml.setLayoutProperty(layer.id, "visibility", "none");
    }
  });
  return gl;
}
