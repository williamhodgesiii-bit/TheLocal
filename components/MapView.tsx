"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { LANDMARKS, RED_MOUNTAIN, type Area, type AreaId, type Spot } from "@/lib/data";
import type { City } from "@/lib/regions";

type Props = {
  city: City;
  areas: Area[];
  spots: Spot[];
  /** list position for each visible spot; printed on its pin */
  numbers: Record<string, number>;
  visible: Set<string>;
  selectedId: string | null;
  hoveredId: string | null;
  area: AreaId | "all";
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onArea: (id: AreaId) => void;
};

const TILES = process.env.NEXT_PUBLIC_MAP_TILES || "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";
const LABELS_ENV = process.env.NEXT_PUBLIC_MAP_LABEL_TILES;
const LABELS = LABELS_ENV === "none" ? "" : LABELS_ENV || "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png";

const LANDMARK_SVG: Record<string, string> = {
  vulcan:
    '<svg viewBox="0 0 24 32" width="16" height="22"><path fill="currentColor" d="M11 6a2.5 2.5 0 1 1 3 0l1 2 6-6 1 1-5.5 7.5L16 16l1 10h3v3H6v-3h3l1-10-2-6 3-4Z"/></svg>',
  furnace:
    '<svg viewBox="0 0 32 32" width="20" height="20"><path fill="currentColor" d="M5 30V14h4V4h3v10h3V8h3v6h3V2h3v12h3v16H5Zm4-8h3v5H9v-5Zm7 0h3v5h-3v-5Z"/></svg>',
  tree: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2 5 12h4l-4 6h6v4h2v-4h6l-4-6h4L12 2Z"/></svg>',
};

/**
 * A non-interactive map: no pan, no zoom, no scroll. The camera is
 * driven entirely by the sidebar (genre, neighborhood, selection). Pins and
 * neighborhood labels remain clickable as shortcuts.
 */
export default function MapView(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Map<string, L.Marker>>(new Map());
  const hoods = useRef<Map<string, L.Marker>>(new Map());
  const cb = useRef(props);
  cb.current = props;

  // init once
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, {
      center: cb.current.city.center,
      zoom: cb.current.city.zoom,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      zoomSnap: 0,
      inertia: false,
      attributionControl: true,
    });
    m.attributionControl.setPrefix(false);
    L.tileLayer(TILES, {
      subdomains: "abcd",
      maxZoom: 19,
      detectRetina: true,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(m);
    if (LABELS) L.tileLayer(LABELS, { subdomains: "abcd", maxZoom: 19, className: "label-tiles" }).addTo(m);

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
          icon: L.divIcon({ className: "landmark", html: `<div>${LANDMARK_SVG[lm.icon]}<span>${lm.label}</span></div>`, iconSize: [0, 0] }),
        }).addTo(m);
      }
    }

    // small screens zoomed out: drop secondary labels so pins stay legible
    const density = () => el.current?.classList.toggle("compact", m.getSize().x < 700 && m.getZoom() < 14.2);
    m.on("zoomend resize", density);
    density();

    const ro = new ResizeObserver(() => m.invalidateSize({ animate: false }));
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
      const label = s.name.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
      const mk = L.marker(s.coords, {
        keyboard: false,
        riseOnHover: true,
        icon: L.divIcon({
          className: "pin-wrap",
          iconSize: [0, 0],
          html: `<div class="pin"><span class="pin-dot"><b class="pin-n"></b></span><span class="pin-label">${label}</span></div>`,
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
      const label = a.label.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
      const mk = L.marker(a.labelAt, {
        keyboard: false,
        icon: L.divIcon({ className: "hood", html: `<button type="button">${label}</button>`, iconSize: [0, 0] }),
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
      node.classList.toggle("dim", !props.visible.has(id));
      node.classList.toggle("hot", props.hoveredId === id);
      node.classList.toggle("selected", props.selectedId === id);
      const num = node.querySelector(".pin-n");
      if (num) num.textContent = props.numbers[id] ? String(props.numbers[id]) : "";
      mk.setZIndexOffset(props.selectedId === id ? 2000 : props.hoveredId === id ? 1000 : props.visible.has(id) ? 0 : -1000);
    });
    hoods.current.forEach((mk, id) => {
      mk.getElement()?.classList.toggle("active", props.area === id);
      mk.getElement()?.classList.toggle("quiet", props.selectedId !== null);
    });
  }, [props.visible, props.numbers, props.hoveredId, props.selectedId, props.area, props.spots, props.areas]);

  // camera
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const opts = { duration: 1.15, easeLinearity: 0.2 };
    if (props.selectedId) {
      const s = props.spots.find((x) => x.id === props.selectedId);
      if (s) m.flyTo(s.coords, 16.6, opts);
      return;
    }
    const pts = props.spots.filter((s) => props.visible.has(s.id) && (props.area === "all" || s.area === props.area)).map((s) => s.coords);
    const area = props.area === "all" ? null : props.areas.find((a) => a.id === props.area) ?? null;
    if (pts.length >= 2) {
      const small = m.getSize().x < 600;
      const pad = small ? 36 : 80;
      // leave headroom for the big neighborhood title in the top-left
      m.flyToBounds(L.latLngBounds(pts), {
        ...opts,
        paddingTopLeft: [pad, small ? 110 : 190],
        paddingBottomRight: [pad, small ? 30 : 70],
        maxZoom: area ? area.zoom + 0.4 : 15,
      });
    } else if (pts.length === 1) {
      m.flyTo(pts[0], area ? area.zoom : 15.5, opts);
    } else if (area) {
      m.flyTo(area.center, area.zoom, opts);
    } else {
      m.flyTo(props.city.center, props.city.zoom, opts);
    }
  }, [props.selectedId, props.visible, props.area, props.spots, props.areas, props.city]);

  return <div ref={el} className="leaflet-host" aria-label={`Map of ${props.city.name} restaurants`} />;
}
