import type { ExpressionSpecification, FilterSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl";

/**
 * The main map's own look, drawn from OpenFreeMap's vector tiles (OpenStreetMap data,
 * OpenMapTiles schema). Warm paper land, white streets with a tan edge so they read on it,
 * gold main roads and interstates, blue water, green parks, buildings when you're close, and
 * street names. Place names and shops stay off: the site prints its own neighborhoods and pins.
 */
export const PRINT_TILES = "https://tiles.openfreemap.org/planet";
export const PRINT_GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

/** colors, in the site's palette */
export const MAP_INK = {
  land: "#ebe3cd",
  residential: "#e7dec7",
  commercial: "#e8d6bd",
  industrial: "#ddd6c6",
  institution: "#e6d8c8", // schools, hospitals, colleges
  cemetery: "#d3dbbb",
  park: "#c7d8a9",
  wood: "#bccf9c",
  grass: "#cfdcb2",
  water: "#9ec1d3",
  waterLine: "#8fb6ca",
  building: "#ddd1b8",
  buildingEdge: "#cbbc9d",
  street: "#ffffff",
  streetEdge: "#c2b393",
  mid: "#fffdf7",
  midEdge: "#b8a681",
  main: "#f8e2a4",
  mainEdge: "#c09a50",
  interstate: "#f0c76f",
  interstateEdge: "#b8893c",
  path: "#a8987a",
  rail: "#9f9584",
  label: "#47423a",
  labelHalo: "#f8f3e6",
  runway: "#d6cdbb",
};
const C = MAP_INK;

const zoomed = (stops: [number, number | string][], base = 1.45): ExpressionSpecification =>
  ["interpolate", ["exponential", base], ["zoom"], ...stops.flat()] as unknown as ExpressionSpecification;
const cls = (...v: string[]): FilterSpecification => ["match", ["get", "class"], v, true, false] as FilterSpecification;
const ground: FilterSpecification = ["!", ["match", ["get", "brunnel"], ["tunnel", "bridge"], true, false]] as FilterSpecification;
const bridge: FilterSpecification = ["==", ["get", "brunnel"], "bridge"] as FilterSpecification;
const tunnel: FilterSpecification = ["==", ["get", "brunnel"], "tunnel"] as FilterSpecification;
const all = (...f: FilterSpecification[]): FilterSpecification => ["all", ...f] as FilterSpecification;

/** road groups, smallest first so bigger roads draw over them. Widths are the fill, in px. */
const isRamp: FilterSpecification = ["==", ["coalesce", ["get", "ramp"], 0], 1] as FilterSpecification;
const notRamp: FilterSpecification = ["!=", ["coalesce", ["get", "ramp"], 0], 1] as FilterSpecification;
const ROADS: { id: string; classes: string[]; extra?: FilterSpecification; min: number; fill: string; edge: string; width: [number, number][]; edgeFrom: number }[] = [
  { id: "service", classes: ["service", "track"], min: 14, fill: C.street, edge: C.streetEdge, width: [[14, 0.6], [16, 2.6], [18, 7]], edgeFrom: 15 },
  { id: "street", classes: ["minor"], min: 11.5, fill: C.street, edge: C.streetEdge, width: [[11.5, 0.5], [13, 1], [14, 2], [16, 5.5], [18, 14]], edgeFrom: 13 },
  { id: "mid", classes: ["secondary", "tertiary"], min: 10, fill: C.mid, edge: C.midEdge, width: [[10, 0.6], [12, 1.4], [14, 3.4], [16, 7.5], [18, 17]], edgeFrom: 11.5 },
  // on- and off-ramps: interstate colors, side-street size
  { id: "ramp", classes: ["motorway"], extra: isRamp, min: 12, fill: C.interstate, edge: C.interstateEdge, width: [[12, 0.8], [14, 2.2], [16, 5], [18, 11]], edgeFrom: 12.5 },
  { id: "main", classes: ["primary", "trunk"], min: 8, fill: C.main, edge: C.mainEdge, width: [[8, 0.6], [10, 1.1], [12, 2.2], [14, 4.6], [16, 9.5], [18, 21]], edgeFrom: 10 },
  { id: "interstate", classes: ["motorway"], extra: notRamp, min: 7, fill: C.interstate, edge: C.interstateEdge, width: [[7, 0.6], [10, 1.3], [12, 2.3], [14, 4.4], [16, 9], [18, 20]], edgeFrom: 9 },
];
/** the edge adds this much on each side, by zoom */
const EDGE: [number, number][] = [[10, 0.6], [14, 1], [16, 1.4], [18, 2]];
const edgeWidth = (w: [number, number][]) =>
  zoomed(w.map(([z, v]) => [z, v + 2 * (EDGE.find(([ez]) => ez >= z)?.[1] ?? EDGE[EDGE.length - 1][1])] as [number, number]));

function roadLayers(kind: "ground" | "bridge" | "tunnel"): LayerSpecification[] {
  const where = kind === "ground" ? ground : kind === "bridge" ? bridge : tunnel;
  const out: LayerSpecification[] = [];
  for (const r of ROADS) {
    const filter = r.extra ? all(cls(...r.classes), r.extra, where) : all(cls(...r.classes), where);
    out.push({
      id: `${kind}-${r.id}-edge`,
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: r.edgeFrom,
      filter,
      layout: { "line-cap": kind === "tunnel" ? "butt" : "round", "line-join": "round" },
      paint: {
        "line-color": r.edge,
        "line-width": edgeWidth(r.width),
        ...(kind === "tunnel" ? { "line-dasharray": [0.6, 0.4], "line-opacity": 0.6 } : {}),
      },
    });
  }
  for (const r of ROADS) {
    out.push({
      id: `${kind}-${r.id}`,
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      minzoom: r.min,
      filter: r.extra ? all(cls(...r.classes), r.extra, where) : all(cls(...r.classes), where),
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        // before its edge shows, a street needs a little more color to read on the paper
        "line-color": zoomed([[r.edgeFrom - 0.5, r.edge], [r.edgeFrom, r.fill]], 1) as unknown as string,
        "line-width": zoomed(r.width),
        ...(kind === "tunnel" ? { "line-opacity": 0.55 } : {}),
      },
    });
  }
  return out;
}

const label = (id: string, classes: string[], min: number, size: [number, number][], font = "Noto Sans Regular"): LayerSpecification => ({
  id,
  type: "symbol",
  source: "openmaptiles",
  "source-layer": "transportation_name",
  minzoom: min,
  filter: cls(...classes),
  layout: {
    "symbol-placement": "line",
    "text-field": ["get", "name"],
    "text-font": [font],
    "text-size": zoomed(size, 1.2),
    "text-max-angle": 30,
    "text-padding": 8,
    "symbol-spacing": 420,
    "text-letter-spacing": 0.02,
    "text-rotation-alignment": "map",
    "text-pitch-alignment": "viewport",
  },
  paint: { "text-color": C.label, "text-halo-color": C.labelHalo, "text-halo-width": 1.6, "text-halo-blur": 0.3 },
});

export function printStyle(attribution?: string, tiles = PRINT_TILES): StyleSpecification {
  return {
    version: 8,
    name: "The Plate Next Door",
    // our credit line replaces the one the tile index carries, so it isn't printed twice
    sources: { openmaptiles: { type: "vector", url: tiles, ...(attribution ? { attribution } : {}) } },
    glyphs: PRINT_GLYPHS,
    layers: [
      { id: "land", type: "background", paint: { "background-color": C.land } },
      {
        id: "landuse",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        paint: {
          "fill-color": [
            "match",
            ["get", "class"],
            ["residential", "suburb", "neighbourhood"],
            C.residential,
            ["commercial", "retail"],
            C.commercial,
            ["industrial", "garages", "railway", "dam", "quarry"],
            C.industrial,
            ["school", "college", "university", "hospital", "kindergarten", "library"],
            C.institution,
            ["cemetery"],
            C.cemetery,
            ["stadium", "pitch", "playground", "track", "zoo", "theme_park"],
            C.grass,
            C.land,
          ],
          "fill-opacity": zoomed([[9, 0.5], [13, 1]], 1),
        },
      },
      {
        id: "landcover",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        filter: cls("wood", "grass", "wetland", "farmland"),
        paint: {
          // city parks and golf courses come through as grass with a subclass
          "fill-color": [
            "match",
            ["get", "subclass"],
            ["park", "garden", "golf_course", "recreation_ground", "village_green"],
            C.park,
            ["match", ["get", "class"], "wood", C.wood, C.grass],
          ],
          "fill-opacity": zoomed([[8, 0.55], [12, 0.85]], 1),
          "fill-antialias": false,
        },
      },
      { id: "park", type: "fill", source: "openmaptiles", "source-layer": "park", paint: { "fill-color": C.park, "fill-opacity": 0.9 } },
      {
        id: "waterway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "waterway",
        filter: ["!=", ["get", "brunnel"], "tunnel"] as FilterSpecification,
        paint: { "line-color": C.waterLine, "line-width": zoomed([[10, 0.4], [13, ["match", ["get", "class"], "river", 2, 1] as unknown as number], [17, ["match", ["get", "class"], "river", 6, 3] as unknown as number]], 1.3) },
      },
      { id: "water", type: "fill", source: "openmaptiles", "source-layer": "water", filter: ["!=", ["get", "brunnel"], "tunnel"] as FilterSpecification, paint: { "fill-color": C.water } },
      {
        id: "runway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "aeroway",
        minzoom: 11,
        filter: ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false] as FilterSpecification,
        paint: { "line-color": C.runway, "line-width": zoomed([[11, 2], [14, 10], [17, 40]], 1.5) },
      },
      {
        id: "building",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 14,
        paint: { "fill-color": C.building, "fill-outline-color": C.buildingEdge, "fill-opacity": zoomed([[14, 0], [15, 0.7], [16.5, 0.95]], 1) },
      },
      ...roadLayers("tunnel"),
      {
        id: "path",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        minzoom: 15.5,
        filter: cls("path"),
        paint: { "line-color": C.path, "line-width": zoomed([[15.5, 0.7], [18, 1.6]], 1.2), "line-dasharray": [2, 2], "line-opacity": 0.5 },
      },
      {
        id: "rail",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        minzoom: 11,
        filter: all(cls("rail", "transit"), ["!=", ["get", "brunnel"], "tunnel"] as FilterSpecification),
        paint: { "line-color": C.rail, "line-width": zoomed([[11, 0.6], [16, 1.6]], 1.3), "line-dasharray": [3, 1.5] },
      },
      ...roadLayers("ground"),
      ...roadLayers("bridge"),
      // just streets: service roads include alleys named for the two streets they join ("Ardsley Sutherland")
      label("street-name", ["minor"], 15, [[14.5, 10.5], [16, 12], [18, 14]]),
      label("mid-name", ["secondary", "tertiary"], 13.5, [[13.5, 10.5], [16, 12.5], [18, 15]]),
      label("main-name", ["primary", "trunk", "motorway"], 11.5, [[11.5, 10.5], [14, 12], [18, 15.5]], "Noto Sans Bold"),
    ],
  };
}
