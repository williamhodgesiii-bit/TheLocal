"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type LngLatLike, type Map as GLMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LANDMARKS, RED_MOUNTAIN } from "@/lib/data";
import { BLANK_STYLE, OFM_CREDIT, OSM_CREDIT, RASTER_STYLE, loadStyle, type Style } from "@/lib/map-style-load";
import { LANDMARK_SVG, declutter, esc, pinHtml, zoomKey, type MapProps } from "./map-shared";

/**
 * The main map, drawn and moved by MapLibre itself, so pinching, scrolling and
 * flying are redrawn every frame and stay sharp at any zoom (vector tiles).
 *
 * The camera follows the menu: pick a kind of food or a part of town and it frames
 * the matches. You can zoom (pinch, scroll wheel, double-click, the +/- buttons or keys),
 * but not drag it around; any new pick re-frames it.
 */

// Our zoom numbers are Leaflet's (256px tiles); MapLibre counts from 512px tiles, one level lower.
const Z = (leafletZoom: number) => leafletZoom - 1;
const ll = (c: [number, number]): LngLatLike => [c[1], c[0]];
// if the vector map hasn't drawn any tiles by then, switch to plain OpenStreetMap tiles
const TILE_WATCHDOG_MS = 6000;

function marker(map: GLMap, at: [number, number], className: string, html: string, z: number) {
  const el = document.createElement("div");
  el.className = className;
  el.innerHTML = html;
  el.style.width = el.style.height = "0"; // zero-size anchor; the CSS centers what's inside
  el.style.zIndex = String(z);
  return new maplibregl.Marker({ element: el, anchor: "top-left" }).setLngLat(ll(at)).addTo(map);
}

/** + / - buttons, printed like the rest of the map */
class ZoomButtons {
  private el = document.createElement("div");
  onAdd(map: GLMap) {
    this.el.className = "maplibregl-ctrl zoom-ctl";
    this.el.innerHTML = '<button type="button" aria-label="Zoom in" title="Zoom in (+)">+</button><button type="button" aria-label="Zoom out" title="Zoom out (−)">−</button>';
    const [inB, outB] = this.el.querySelectorAll("button");
    inB.onclick = () => map.zoomIn({ duration: 250 });
    outB.onclick = () => map.zoomOut({ duration: 250 });
    return this.el;
  }
  onRemove() {
    this.el.remove();
  }
}

export default function MapViewGL(props: MapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<GLMap | null>(null);
  const pins = useRef<Map<string, Marker>>(new Map());
  const hoods = useRef<Map<string, Marker>>(new Map());
  const cb = useRef(props);
  cb.current = props;

  const raf = useRef(0);
  const tidy = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => el.current && declutter(el.current));
  };

  // init once
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: BLANK_STYLE, // paper right away; the real style swaps in when it arrives
      center: ll(cb.current.city.center),
      zoom: Z(cb.current.city.zoom),
      minZoom: 9,
      maxZoom: 18.5,
      dragPan: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      keyboard: false,
      boxZoom: false,
      scrollZoom: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
      maxPitch: 0,
      renderWorldCopies: false,
      attributionControl: false,
      fadeDuration: 0, // labels appear at once instead of fading in
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2), // retina-sharp without drawing 9x the pixels on 3x phones
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(new ZoomButtons(), "bottom-right");
    map.current = m;
    (el.current as HTMLDivElement & { __map?: GLMap }).__map = m; // handy for tests and debugging

    let alive = true;
    let attribution: maplibregl.AttributionControl | null = null;
    const credit = (html: string) => {
      if (attribution) m.removeControl(attribution);
      attribution = new maplibregl.AttributionControl({ compact: false, customAttribution: html });
      m.addControl(attribution, "bottom-right");
    };

    // the Red Mountain ridge is part of the map itself, so it is re-added with each style
    const addRidge = () => {
      if (cb.current.city.id !== "birmingham-al" || m.getSource("ridge")) return;
      m.addSource("ridge", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: RED_MOUNTAIN.map(([a, b]) => [b, a]) } } });
      m.addLayer({ id: "ridge", type: "line", source: "ridge", layout: { "line-cap": "round" }, paint: { "line-color": "#2C5A43", "line-width": 1.4, "line-opacity": 0.55, "line-dasharray": [0.1, 4] } });
    };
    m.on("style.load", addRidge);

    // Vector map first. Plain OpenStreetMap tiles take over if the style can't be fetched,
    // if tiles keep failing before any has drawn, or if nothing has drawn after a few seconds.
    let usingRaster = false;
    let vector = false;
    let drew = false;
    let failures = 0;
    const toRaster = (why: string) => {
      if (!alive || usingRaster) return;
      usingRaster = true;
      console.warn(`Map: using OpenStreetMap tiles (${why}).`);
      m.setStyle(RASTER_STYLE, { diff: false });
      credit(OSM_CREDIT);
    };
    m.on("data", (e) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (vector && e.dataType === "source" && (e as any).tile && (e as any).sourceId !== "ridge") drew = true;
    });
    m.on("error", () => {
      if (vector && !drew && ++failures >= 4) toRaster("tiles failing");
    });
    // the clock only runs while the map is on screen: a hidden map (phone list tab) loads no tiles
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let armWhenShown = false;
    const arm = () => {
      if (!vector || drew || usingRaster || watchdog) return;
      if ((el.current?.clientWidth ?? 0) < 10) return void (armWhenShown = true);
      armWhenShown = false;
      watchdog = setTimeout(() => !drew && toRaster("no tiles in time"), TILE_WATCHDOG_MS);
    };
    loadStyle("print")
      .then((style: Style) => {
        if (!alive) return;
        vector = true;
        m.setStyle(style, { diff: false });
        credit(OFM_CREDIT);
        arm();
      })
      .catch(() => toRaster("style unavailable"));

    if (cb.current.city.id === "birmingham-al") {
      marker(m, [33.4745, -86.835], "ridge-label", "<span>Red Mountain</span>", 0);
      for (const lm of LANDMARKS) marker(m, lm.coords, "landmark", `<div>${LANDMARK_SVG[lm.icon]}<span>${esc(lm.label)}</span></div>`, 0);
    }

    // small screens zoomed out: drop secondary labels so pins stay legible
    const density = () => el.current?.classList.toggle("compact", (el.current?.clientWidth ?? 0) < 700 && m.getZoom() < Z(14.2));
    m.on("zoomend", density);
    m.on("moveend", tidy);
    density();

    let lastW = el.current.clientWidth;
    const ro = new ResizeObserver(() => {
      m.resize();
      density();
      tidy();
      const w = el.current?.clientWidth ?? 0;
      if (w > 10 && lastW <= 10) {
        setTimeout(() => aim.current(), 30); // shown again (phone tabs)
        if (armWhenShown) arm();
      }
      lastW = w;
    });
    ro.observe(el.current);

    return () => {
      alive = false;
      clearTimeout(watchdog);
      ro.disconnect();
      m.remove();
      map.current = null;
      pins.current.clear();
      hoods.current.clear();
    };
  }, []);

  // keep pins in sync with the spot list (community spots arrive async / after approval)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const ids = new Set(props.spots.map((s) => s.id));
    pins.current.forEach((mk, id) => {
      if (!ids.has(id)) {
        mk.remove();
        pins.current.delete(id);
      }
    });
    for (const s of props.spots) {
      const have = pins.current.get(s.id);
      if (have) {
        have.setLngLat(ll(s.coords)); // exact coordinates can arrive after first paint
        continue;
      }
      const mk = marker(m, s.coords, "pin-wrap", pinHtml(s.name), 10);
      const node = mk.getElement();
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        cb.current.onSelect(s.id);
      });
      node.addEventListener("mouseenter", () => cb.current.onHover(s.id));
      node.addEventListener("mouseleave", () => cb.current.onHover(null));
      pins.current.set(s.id, mk);
    }
  }, [props.spots]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    hoods.current.forEach((mk) => mk.remove());
    hoods.current.clear();
    for (const a of props.areas) {
      const mk = marker(m, a.labelAt, "hood", `<button type="button">${esc(a.label)}</button>`, 1);
      mk.getElement().addEventListener("click", (e) => {
        e.stopPropagation();
        cb.current.onArea(a.id);
      });
      hoods.current.set(a.id, mk);
    }
  }, [props.areas]);

  // marker states
  useEffect(() => {
    pins.current.forEach((mk, id) => {
      const wrap = mk.getElement();
      const node = wrap.querySelector(".pin");
      if (!node) return;
      const vis = props.visible.has(id);
      node.classList.toggle("dim", !vis && props.selectedId !== id);
      node.classList.toggle("hot", props.hoveredId === id);
      node.classList.toggle("selected", props.selectedId === id);
      const num = node.querySelector(".pin-n");
      if (num) num.textContent = props.numbers[id] ? String(props.numbers[id]) : "";
      wrap.style.zIndex = String(props.selectedId === id ? 2000 : props.hoveredId === id ? 1000 : vis ? 10 : 2);
    });
    hoods.current.forEach((mk, id) => {
      const a = props.areas.find((x) => x.id === id);
      mk.getElement().classList.toggle("active", props.area === id || (!!a?.town && props.area === `t:${a.town}`));
      mk.getElement().classList.toggle("quiet", props.selectedId !== null);
    });
    tidy();
  }, [props.visible, props.numbers, props.hoveredId, props.selectedId, props.area, props.spots, props.areas]);

  // + and - zoom the map from anywhere on the page (not while typing). Presses made
  // while a zoom is still easing add up toward one target, so none are lost.
  useEffect(() => {
    let target: number | null = null;
    const onKey = (e: KeyboardEvent) => {
      const m = map.current;
      const d = zoomKey(e);
      if (!m || !d || (el.current?.clientWidth ?? 0) < 10) return;
      e.preventDefault();
      const base = target !== null && m.isZooming() ? target : m.getZoom();
      target = Math.max(m.getMinZoom(), Math.min(m.getMaxZoom(), base + d * 0.75));
      m.easeTo({ zoom: target, duration: 250 });
      m.once("zoomend", () => (target = null));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // camera
  const aimed = useRef(false);
  const aim = useRef<() => void>(() => {});
  aim.current = () => {
    const m = map.current;
    const box = el.current;
    if (!m || !box) return;
    const w = box.clientWidth;
    const h = box.clientHeight;
    if (w < 10 || h < 10) return; // hidden (phone list tab); re-aimed when shown
    // the first view jumps straight into place: one set of tiles to load, not two
    const first = !aimed.current;
    aimed.current = true;
    const dur = first ? 0 : 1100;
    const small = w < 600;
    if (props.selectedId) {
      const s = props.spots.find((x) => x.id === props.selectedId);
      if (s) m.flyTo({ center: ll(s.coords), zoom: Z(small ? 16 : 16.6), duration: dur });
      return;
    }
    if (props.focusId) {
      const s = props.spots.find((x) => x.id === props.focusId);
      if (s) m.flyTo({ center: ll(s.coords), zoom: Math.max(m.getZoom(), Z(15)), duration: first ? 0 : 600 });
      return;
    }
    const pts = props.spots.filter((s) => props.visible.has(s.id)).map((s) => s.coords);
    if (pts.length >= 2) {
      const side = small ? 44 : 80;
      let top = props.topPad ?? (small ? 96 : 170);
      let bottom = small ? (props.topPad ? 150 : 30) : 70;
      // padding can never eat the whole map (tiny screens, landscape phones)
      const room = h - 60;
      if (top + bottom > room) {
        const k = Math.max(0, room) / (top + bottom);
        top *= k;
        bottom *= k;
      }
      const sidePad = Math.min(side, Math.max(0, (w - 60) / 2));
      const lats = pts.map((p) => p[0]);
      const lngs = pts.map((p) => p[1]);
      m.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: { top, bottom, left: sidePad, right: sidePad }, maxZoom: Z(props.frame.maxZoom), duration: dur }
      );
    } else if (pts.length === 1) {
      m.flyTo({ center: ll(pts[0]), zoom: Z(Math.min(16, props.frame.maxZoom)), duration: dur });
    } else {
      m.flyTo({ center: ll(props.frame.center), zoom: Z(props.frame.zoom), duration: dur });
    }
  };
  useEffect(() => {
    aim.current();
  }, [props.selectedId, props.focusId, props.visible, props.area, props.spots, props.frame, props.topPad]);

  return <div ref={el} className="leaflet-host gl-host" aria-label={`Map of ${props.city.name} restaurants`} />;
}
