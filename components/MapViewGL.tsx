"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type LngLatLike, type Map as GLMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LANDMARKS, RED_MOUNTAIN } from "@/lib/data";
import { BLANK_STYLE, OFM_CREDIT, OSM_CREDIT, RASTER_STYLE, loadStyle, type Style } from "@/lib/map-style-load";
import { MAP_STYLES } from "@/lib/map-styles";
import {
  LANDMARK_SVG,
  NAME_ZOOM,
  Recenter,
  coverBoxes,
  declutter,
  dotBox,
  esc,
  nameSize,
  onTap,
  pinHtml,
  placeNames,
  showNames,
  zoomKey,
  type MapProps,
  type NameCandidate,
  type NameSide,
  type ScreenBox,
} from "./map-shared";

/**
 * The main map, drawn and moved by MapLibre itself, so pinching, scrolling and
 * flying are redrawn every frame and stay sharp at any zoom (vector tiles).
 *
 * The camera follows the browse bar: pick a kind of food or a part of town and it frames
 * the matches. Drag it around (mouse or one finger) and zoom (pinch, scroll wheel,
 * double-click, the +/- buttons or keys); "Recenter" or any new pick frames it again.
 */

// Our zoom numbers are Leaflet's (256px tiles); MapLibre counts from 512px tiles, one level lower.
const Z = (leafletZoom: number) => leafletZoom - 1;
const ll = (c: [number, number]): LngLatLike => [c[1], c[0]];
// if the vector map hasn't drawn any tiles by then, switch to plain OpenStreetMap tiles
const TILE_WATCHDOG_MS = 6000;

/**
 * a11y: a pin is a button named for its place; a neighborhood label is a group around its own
 * button; landmarks are decoration. (MapLibre would otherwise call every one a "Map marker" button.)
 */
type MarkerRole = { role: "button"; label: string } | { role: "group"; label: string } | { role: "decor" };

function marker(map: GLMap, at: [number, number], className: string, html: string, z: number, a11y: MarkerRole) {
  const el = document.createElement("div");
  el.className = className;
  el.innerHTML = html;
  el.style.width = el.style.height = "0"; // zero-size anchor; the CSS centers what's inside
  el.style.zIndex = String(z);
  if (a11y.role === "decor") {
    el.setAttribute("role", "presentation");
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("aria-label", "");
  } else {
    el.setAttribute("role", a11y.role);
    el.setAttribute("aria-label", a11y.label);
    if (a11y.role === "button") el.tabIndex = 0;
  }
  return new maplibregl.Marker({ element: el, anchor: "top-left" }).setLngLat(ll(at)).addTo(map);
}

/** + / - buttons, printed like the rest of the map */
class ZoomButtons {
  private el = document.createElement("div");
  onAdd(map: GLMap) {
    this.el.className = "maplibregl-ctrl zoom-ctl";
    this.el.innerHTML = '<button type="button" aria-label="Zoom in" title="Zoom in (+)">+</button><button type="button" aria-label="Zoom out" title="Zoom out (−)">−</button>';
    const [inB, outB] = this.el.querySelectorAll("button");
    inB.onclick = () => map.zoomIn({ duration: 250 }, { user: true });
    outB.onclick = () => map.zoomOut({ duration: 250 }, { user: true });
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
  /** each pin's .pin node, so naming them every frame doesn't search the page */
  const pinEls = useRef<Map<string, HTMLElement>>(new Map());
  const hoods = useRef<Map<string, Marker>>(new Map());
  const cb = useRef(props);
  cb.current = props;
  /** the visitor moved the map themselves, so offer a way back to their picks */
  const [moved, setMoved] = useState(false);

  // Zoomed in, each pin carries its name where there's room (placeNames). Redone every frame
  // the map moves, so names make way and come back as pins spread apart or crowd together.
  const named = useRef<Map<string, NameSide>>(new Map());
  const sizes = useRef<Map<string, [number, number]>>(new Map());
  /** the caption, key and buttons over the map, read when it stops moving */
  const covers = useRef<ScreenBox[]>([]);
  const names = () => {
    const m = map.current;
    const box = el.current;
    if (!m || !box) return;
    const w = box.clientWidth;
    const h = box.clientHeight;
    const p = cb.current;
    const cands: NameCandidate[] = [];
    const blocked: ScreenBox[] = [...covers.current];
    if (w > 10 && m.getZoom() >= Z(NAME_ZOOM)) {
      for (const s of p.spots) {
        const sel = s.id === p.selectedId;
        if (!sel && !p.visible.has(s.id)) continue;
        const pt = m.project(ll(s.coords));
        if (pt.x < -40 || pt.y < -40 || pt.x > w + 40 || pt.y > h + 40) continue;
        blocked.push(dotBox(pt.x, pt.y));
        const pin = pinEls.current.get(s.id);
        if (sel) {
          // the open place already shows its full name: keep the others off it
          const lab = pin?.querySelector<HTMLElement>(".pin-label");
          if (lab) blocked.push({ l: pt.x + 19, r: pt.x + 19 + lab.offsetWidth, t: pt.y - 14, b: pt.y - 14 + lab.offsetHeight });
          continue;
        }
        const size = nameSize(sizes.current, s.id, pin);
        if (size) cands.push({ id: s.id, x: pt.x, y: pt.y, w: size[0], h: size[1], rank: p.numbers[s.id] ?? 1000 - s.pop, prev: named.current.get(s.id) });
      }
    }
    const next = placeNames(cands, blocked, w, h);
    showNames(pinEls.current, next, named.current);
    named.current = next;
  };
  const nameRaf = useRef(0);
  const nameSoon = () => {
    if (nameRaf.current) return;
    nameRaf.current = requestAnimationFrame(() => {
      nameRaf.current = 0;
      names();
    });
  };

  const raf = useRef(0);
  const tidy = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      if (el.current) covers.current = coverBoxes(el.current);
      names();
      if (el.current) declutter(el.current);
    });
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
      dragPan: true, // mouse drag and one-finger drag, with a little glide at the end
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
    // drags, wheel turns and pinches carry the browser event; our buttons and keys pass { user: true }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byHand = (e: any) => (e.originalEvent || e.user) && setMoved(true);
    m.on("dragstart", byHand);
    m.on("zoomstart", byHand); // pinch, double-click, our buttons and keys
    m.on("wheel", () => setMoved(true)); // the wheel's own zoom events don't carry the browser event
    map.current = m;
    (el.current as HTMLDivElement & { __map?: GLMap }).__map = m; // handy for tests and debugging

    let alive = true;
    let attribution: maplibregl.AttributionControl | null = null;
    const credit = (html?: string) => {
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
      el.current?.classList.add("raster"); // photo-like tiles get the softer paper treatment
      m.setStyle(RASTER_STYLE, { diff: false });
      credit(OSM_CREDIT);
    };
    m.on("data", (e) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (vector && e.dataType === "source" && (e as any).tile && (e as any).sourceId !== "ridge") drew = true;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    m.on("error", (e: any) => {
      if (!vector || drew) return;
      // the tile index itself didn't load, so no tiles ever will
      if (e.sourceId === "openmaptiles" && !e.tile) return toRaster("tile index unavailable");
      if (++failures >= 4) toRaster("tiles failing");
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
        credit(MAP_STYLES.print ? OFM_CREDIT : undefined); // our own style carries the credit on its tiles
        arm();
      })
      .catch(() => toRaster("style unavailable"));

    if (cb.current.city.id === "birmingham-al") {
      marker(m, [33.4745, -86.835], "ridge-label", "<span>Red Mountain</span>", 0, { role: "decor" });
      for (const lm of LANDMARKS) marker(m, lm.coords, "landmark", `<div>${LANDMARK_SVG[lm.icon]}<span>${esc(lm.label)}</span></div>`, 0, { role: "decor" });
    }

    // small screens zoomed out: drop secondary labels so pins stay legible
    const density = () => el.current?.classList.toggle("compact", (el.current?.clientWidth ?? 0) < 700 && m.getZoom() < Z(14.2));
    m.on("zoomend", density);
    m.on("move", nameSoon);
    m.on("moveend", tidy);
    density();
    // names were measured in the fallback font; measure again once the real one is in
    document.fonts?.ready.then(() => {
      if (!alive) return;
      sizes.current.clear();
      tidy();
    });

    let lastW = el.current.clientWidth;
    let lastH = el.current.clientHeight;
    const ro = new ResizeObserver(() => {
      m.resize();
      density();
      tidy();
      const w = el.current?.clientWidth ?? 0;
      const h = el.current?.clientHeight ?? 0;
      if (w > 10 && lastW <= 10) {
        setTimeout(() => aim.current(), 30); // shown again (phone tabs)
        if (armWhenShown) arm();
      } else if (w > 10 && lastH > 10 && Math.abs(h - lastH) > lastH * 0.2) {
        // the layout changed under the map (full map → the short strip over a place): aim again,
        // instantly, once the new size has settled
        setTimeout(() => aim.current(true), 30);
      }
      lastW = w;
      lastH = h;
    });
    ro.observe(el.current);

    return () => {
      alive = false;
      clearTimeout(watchdog);
      cancelAnimationFrame(nameRaf.current);
      cancelAnimationFrame(raf.current);
      ro.disconnect();
      m.remove();
      map.current = null;
      pins.current.clear();
      pinEls.current.clear();
      named.current.clear();
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
        pinEls.current.delete(id);
        named.current.delete(id);
        sizes.current.delete(id);
      }
    });
    for (const s of props.spots) {
      const have = pins.current.get(s.id);
      if (have) {
        have.setLngLat(ll(s.coords)); // exact coordinates can arrive after first paint
        continue;
      }
      const mk = marker(m, s.coords, "pin-wrap", pinHtml(s.name), 10, { role: "button", label: s.name });
      const node = mk.getElement();
      onTap(node, () => cb.current.onSelect(s.id)); // a drag that starts on a pin moves the map, it doesn't open the place
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cb.current.onSelect(s.id);
        }
      });
      node.addEventListener("mouseenter", () => cb.current.onHover(s.id));
      node.addEventListener("mouseleave", () => cb.current.onHover(null));
      pins.current.set(s.id, mk);
      const pin = node.querySelector<HTMLElement>(".pin");
      if (pin) pinEls.current.set(s.id, pin);
    }
  }, [props.spots]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    hoods.current.forEach((mk) => mk.remove());
    hoods.current.clear();
    for (const a of props.areas) {
      const mk = marker(m, a.labelAt, "hood", `<button type="button">${esc(a.label)}</button>`, 1, { role: "group", label: `${a.label} neighborhood` });
      onTap(mk.getElement(), () => cb.current.onArea(a.id));
      hoods.current.set(a.id, mk);
    }
  }, [props.areas]);

  // marker states (hover is handled on its own below: it only touches two pins)
  const hovered = useRef<string | null>(null);
  useEffect(() => {
    pins.current.forEach((mk, id) => {
      const wrap = mk.getElement();
      const node = wrap.querySelector(".pin");
      if (!node) return;
      const vis = props.visible.has(id);
      node.classList.toggle("dim", !vis && props.selectedId !== id);
      node.classList.toggle("selected", props.selectedId === id);
      const num = node.querySelector(".pin-n");
      if (num) num.textContent = props.numbers[id] ? String(props.numbers[id]) : "";
      wrap.style.zIndex = String(props.selectedId === id ? 2000 : hovered.current === id ? 1000 : vis ? 10 : 2);
    });
    hoods.current.forEach((mk, id) => {
      const a = props.areas.find((x) => x.id === id);
      mk.getElement().classList.toggle("active", props.area === id || (!!a?.town && props.area === `t:${a.town}`));
      mk.getElement().classList.toggle("quiet", props.selectedId !== null);
    });
    tidy();
  }, [props.visible, props.numbers, props.selectedId, props.area, props.spots, props.areas]);

  // hovering a list row or a pin lifts that one pin; no relayout of the map's labels
  useEffect(() => {
    const set = (id: string | null, on: boolean) => {
      const wrap = id ? pins.current.get(id)?.getElement() : null;
      if (!wrap || !id) return;
      wrap.querySelector(".pin")?.classList.toggle("hot", on);
      wrap.style.zIndex = String(cb.current.selectedId === id ? 2000 : on ? 1000 : cb.current.visible.has(id) ? 10 : 2);
    };
    set(hovered.current, false);
    hovered.current = props.hoveredId;
    set(props.hoveredId, true);
  }, [props.hoveredId]);

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
      m.easeTo({ zoom: target, duration: 250 }, { user: true });
      m.once("zoomend", () => (target = null));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // camera
  const aimed = useRef(false);
  const aim = useRef<(instant?: boolean) => void>(() => {});
  aim.current = (instant = false) => {
    const m = map.current;
    const box = el.current;
    if (!m || !box) return;
    const w = box.clientWidth;
    const h = box.clientHeight;
    if (w < 10 || h < 10) return; // hidden (phone list tab); re-aimed when shown
    // the box may have just changed size (phone: Map tab → the short strip over a place).
    // A fly works out where the middle is when it starts, so resize first.
    const c = m.getCanvas();
    const resized = Math.abs(c.clientWidth - w) > 1 || Math.abs(c.clientHeight - h) > 1;
    if (resized) m.resize();
    setMoved(false);
    // the first view jumps straight into place: one set of tiles to load, not two
    const first = !aimed.current;
    aimed.current = true;
    // the box just changed size (it already jumped on screen): jump the camera too, so two
    // flights can't overlap and leave the place off the edge of the strip
    const dur = first || instant || resized ? 0 : 1100;
    const small = w < 600;
    // MapLibre keeps the last padding it was given, so every move below sets its own:
    // otherwise the Map tab's room for the caption and cards would push a place
    // opened from there off the top of the short map strip
    const side = Math.min(small ? 44 : 80, Math.max(0, (w - 60) / 2));
    let top = props.topPad ?? (small ? 96 : 170);
    let bottom = small ? (props.topPad ? 150 : 30) : 70;
    // padding can never eat the whole map (tiny screens, landscape phones)
    const room = h - 60;
    if (top + bottom > room) {
      const k = Math.max(0, room) / (top + bottom);
      top *= k;
      bottom *= k;
    }
    const framed = { top, bottom, left: side, right: side };
    const none = { top: 0, bottom: 0, left: 0, right: 0 };
    if (props.selectedId) {
      const s = props.spots.find((x) => x.id === props.selectedId);
      if (s) m.flyTo({ center: ll(s.coords), zoom: Z(small ? 16 : 16.6), duration: dur, padding: none });
      return;
    }
    if (props.focusId) {
      // the card under the map steers it: keep the pin between the caption and the cards
      const s = props.spots.find((x) => x.id === props.focusId);
      if (s) m.flyTo({ center: ll(s.coords), zoom: Math.max(m.getZoom(), Z(15)), duration: dur ? 600 : 0, padding: framed });
      return;
    }
    const pts = props.spots.filter((s) => props.visible.has(s.id)).map((s) => s.coords);
    if (pts.length >= 2) {
      const lats = pts.map((p) => p[0]);
      const lngs = pts.map((p) => p[1]);
      m.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: framed, maxZoom: Z(props.frame.maxZoom), duration: dur }
      );
    } else if (pts.length === 1) {
      m.flyTo({ center: ll(pts[0]), zoom: Z(Math.min(16, props.frame.maxZoom)), duration: dur, padding: framed });
    } else {
      m.flyTo({ center: ll(props.frame.center), zoom: Z(props.frame.zoom), duration: dur, padding: framed });
    }
  };
  // re-frame only when what's picked really changes: a ratings refresh re-sorts the list
  // (a new Set, same places) and must not yank the map back from where someone dragged it
  const visibleKey = useMemo(() => [...props.visible].sort().join(","), [props.visible]);
  const spotsKey = useMemo(() => props.spots.map((s) => `${s.id}${s.coords}`).join("|"), [props.spots]);
  useEffect(() => {
    aim.current();
  }, [props.selectedId, props.focusId, visibleKey, props.area, spotsKey, props.frame, props.topPad]);

  return (
    <>
      <div ref={el} className="leaflet-host gl-host" aria-label={`Map of ${props.city.name} restaurants`} />
      <Recenter show={moved} onClick={() => aim.current()} />
    </>
  );
}
