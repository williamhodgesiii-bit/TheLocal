"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { LANDMARKS, RED_MOUNTAIN } from "@/lib/data";
import { OSM_CREDIT, OSM_TILES } from "@/lib/map-style-load";
import { LANDMARK_SVG, declutter as declutterIn, esc, pinHtml, zoomKey, type MapProps } from "./map-shared";

/**
 * Fallback map for devices that can't draw vector maps (no WebGL): Leaflet with
 * OpenStreetMap raster tiles. Same pins, labels, camera and zoom as MapViewGL.
 */
export default function MapViewLeaflet(props: MapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Map<string, L.Marker>>(new Map());
  const hoods = useRef<Map<string, L.Marker>>(new Map());
  const cb = useRef(props);
  cb.current = props;

  /**
   * Labels never sit on pins or on each other. Pins win, then the active
   * neighborhood, then other neighborhoods, then the ridge and landmarks.
   * Whatever doesn't fit is hidden until the camera moves.
   */
  const raf = useRef(0);
  const declutter = useRef(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => el.current && declutterIn(el.current));
  });

  // init once
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, {
      center: cb.current.city.center,
      zoom: cb.current.city.zoom,
      zoomControl: false,
      dragging: false,
      // zoom by scroll wheel, double-click, pinch, the +/- buttons or the +/- keys;
      // the camera still follows the menu, and any new pick re-frames the map
      scrollWheelZoom: true,
      wheelPxPerZoomLevel: 90,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: false,
      keyboard: false,
      minZoom: 10,
      maxZoom: 19,
      zoomSnap: 0,
      zoomDelta: 0.75,
      inertia: false,
      attributionControl: true,
    });
    m.attributionControl.setPrefix(false);
    L.control.zoom({ position: "bottomright", zoomInTitle: "Zoom in (+)", zoomOutTitle: "Zoom out (−)" }).addTo(m);
    L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_CREDIT }).addTo(m);

    if (cb.current.city.id === "birmingham-al") {
      // Red Mountain ridge — the over-the-mountain divide
      L.polyline(RED_MOUNTAIN, { color: "#2C5A43", weight: 1.4, opacity: 0.55, dashArray: "1 6", lineCap: "round", interactive: false }).addTo(m);
      L.marker([33.4745, -86.835], {
        interactive: false,
        icon: L.divIcon({ className: "ridge-label", html: "<span>Red Mountain</span>", iconSize: [0, 0] }),
      }).addTo(m);

      for (const lm of LANDMARKS) {
        L.marker(lm.coords, {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({ className: "landmark", html: `<div>${LANDMARK_SVG[lm.icon]}<span>${esc(lm.label)}</span></div>`, iconSize: [0, 0] }),
        }).addTo(m);
      }
    }

    // small screens zoomed out: drop secondary labels so pins stay legible
    const density = () => el.current?.classList.toggle("compact", m.getSize().x < 700 && m.getZoom() < 14.2);
    m.on("zoomend resize", density);
    density();
    m.on("moveend zoomend resize", () => declutter.current());

    let lastW = el.current.clientWidth;
    const ro = new ResizeObserver(() => {
      m.invalidateSize({ animate: false });
      const w = el.current?.clientWidth ?? 0;
      if (w > 10 && lastW <= 10) setTimeout(() => aim.current(), 30);
      lastW = w;
    });
    ro.observe(el.current);
    map.current = m;
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      markers.current.clear();
      hoods.current.clear();
    };
  }, []);

  // keep pins in sync with the spot list (community spots arrive async / after approval)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const ids = new Set(props.spots.map((s) => s.id));
    markers.current.forEach((mk, id) => {
      if (!ids.has(id)) {
        mk.remove();
        markers.current.delete(id);
      }
    });
    for (const s of props.spots) {
      if (markers.current.has(s.id)) continue;
      const mk = L.marker(s.coords, {
        keyboard: false,
        riseOnHover: true,
        icon: L.divIcon({
          className: "pin-wrap",
          iconSize: [0, 0],
          html: pinHtml(s.name),
        }),
      })
        .on("click", () => cb.current.onSelect(s.id))
        .on("mouseover", () => cb.current.onHover(s.id))
        .on("mouseout", () => cb.current.onHover(null))
        .addTo(m);
      markers.current.set(s.id, mk);
    }
  }, [props.spots]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    hoods.current.forEach((mk) => mk.remove());
    hoods.current.clear();
    for (const a of props.areas) {
      const mk = L.marker(a.labelAt, {
        keyboard: false,
        icon: L.divIcon({ className: "hood", html: `<button type="button">${esc(a.label)}</button>`, iconSize: [0, 0] }),
        zIndexOffset: -500,
      })
        .on("click", () => cb.current.onArea(a.id))
        .addTo(m);
      hoods.current.set(a.id, mk);
    }
  }, [props.areas]);

  // marker states
  useEffect(() => {
    markers.current.forEach((mk, id) => {
      const node = mk.getElement()?.querySelector(".pin");
      if (!node) return;
      node.classList.toggle("dim", !props.visible.has(id) && props.selectedId !== id);
      node.classList.toggle("hot", props.hoveredId === id);
      node.classList.toggle("selected", props.selectedId === id);
      const num = node.querySelector(".pin-n");
      if (num) num.textContent = props.numbers[id] ? String(props.numbers[id]) : "";
      mk.setZIndexOffset(props.selectedId === id ? 2000 : props.hoveredId === id ? 1000 : props.visible.has(id) ? 0 : -1000);
    });
    hoods.current.forEach((mk, id) => {
      const a = props.areas.find((x) => x.id === id);
      mk.getElement()?.classList.toggle("active", props.area === id || (!!a?.town && props.area === `t:${a.town}`));
      mk.getElement()?.classList.toggle("quiet", props.selectedId !== null);
    });
  }, [props.visible, props.numbers, props.hoveredId, props.selectedId, props.area, props.spots, props.areas]);

  useEffect(() => {
    declutter.current();
  }, [props.visible, props.numbers, props.hoveredId, props.selectedId, props.area, props.spots, props.areas]);

  // + and - zoom the map from anywhere on the page (not while typing). Presses made
  // while a zoom is still animating add up and apply when it lands, so none are lost.
  useEffect(() => {
    let pending = 0;
    const flush = () => {
      const m = map.current;
      if (!m || !pending) return;
      const z = Math.max(m.getMinZoom(), Math.min(m.getMaxZoom(), m.getZoom() + pending * 0.75));
      pending = 0;
      m.setZoom(z);
    };
    const onKey = (e: KeyboardEvent) => {
      const m = map.current;
      const d = zoomKey(e);
      if (!m || !d || m.getSize().x < 10) return; // map hidden (phone list tab)
      pending += d;
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((m as any)._animatingZoom) m.once("zoomend", flush);
      else flush();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // camera
  const aimed = useRef(false);
  const aim = useRef<() => void>(() => {});
  aim.current = () => {
    const m = map.current;
    if (!m) return;
    const size = m.getSize();
    if (size.x < 10 || size.y < 10) return; // hidden (mobile list tab); re-aimed on resize
    // the first view jumps straight into place: one set of tiles to load, not two
    const first = !aimed.current;
    aimed.current = true;
    const opts = first ? { animate: false, duration: 0 } : { duration: 1.1, easeLinearity: 0.2 };
    const small = size.x < 600;
    const top = props.topPad ?? (small ? 96 : 170);
    if (props.selectedId) {
      const s = props.spots.find((x) => x.id === props.selectedId);
      if (s) m.flyTo(s.coords, small ? 16 : 16.6, opts);
      return;
    }
    if (props.focusId) {
      const s = props.spots.find((x) => x.id === props.focusId);
      if (s) m.flyTo(s.coords, Math.max(m.getZoom(), 15), { duration: 0.6 });
      return;
    }
    const pts = props.spots.filter((s) => props.visible.has(s.id)).map((s) => s.coords);
    if (pts.length >= 2) {
      const pad = small ? 44 : 80;
      m.flyToBounds(L.latLngBounds(pts), {
        ...opts,
        paddingTopLeft: [pad, top],
        paddingBottomRight: [pad, small ? (props.topPad ? 150 : 30) : 70],
        maxZoom: props.frame.maxZoom,
      });
    } else if (pts.length === 1) {
      m.flyTo(pts[0], Math.min(16, props.frame.maxZoom), opts);
    } else {
      m.flyTo(props.frame.center, props.frame.zoom, opts);
    }
  };
  useEffect(() => {
    aim.current();
  }, [props.selectedId, props.focusId, props.visible, props.area, props.spots, props.frame, props.topPad]);

  return <div ref={el} className="leaflet-host" aria-label={`Map of ${props.city.name} restaurants`} />;
}
