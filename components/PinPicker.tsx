"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

const TILES = process.env.NEXT_PUBLIC_MAP_TILES || "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

/** Small interactive map for dropping/dragging a pin. (The main map stays non-interactive.) */
export default function PinPicker({
  center,
  value,
  onChange,
  zoom = 13,
}: {
  center: [number, number];
  value: [number, number] | null;
  onChange: (c: [number, number]) => void;
  zoom?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const pin = useRef<L.Marker | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center: value ?? center, zoom: value ? 17 : zoom, zoomControl: true, attributionControl: false, scrollWheelZoom: false });
    L.tileLayer(TILES, { subdomains: "abcd", maxZoom: 19 }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => cb.current([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]));
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    map.current = m;
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      pin.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      pin.current?.remove();
      pin.current = null;
      return;
    }
    if (!pin.current) {
      pin.current = L.marker(value, {
        draggable: true,
        icon: L.divIcon({ className: "pick-pin", html: "<span></span>", iconSize: [0, 0] }),
      })
        .on("dragend", () => {
          const ll = pin.current!.getLatLng();
          cb.current([+ll.lat.toFixed(6), +ll.lng.toFixed(6)]);
        })
        .addTo(m);
    } else pin.current.setLatLng(value);
    if (!m.getBounds().pad(-0.2).contains(value)) m.flyTo(value, Math.max(m.getZoom(), 16), { duration: 0.6 });
  }, [value]);

  return <div ref={el} className="pin-picker" />;
}
