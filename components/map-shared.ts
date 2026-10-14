import type { Area, AreaId, Spot } from "@/lib/data";
import type { City } from "@/lib/regions";

export type MapProps = {
  city: City;
  areas: Area[];
  spots: Spot[];
  /** list position for each visible spot; printed on its pin */
  numbers: Record<string, number>;
  visible: Set<string>;
  selectedId: string | null;
  hoveredId: string | null;
  /** card centered in the mobile carousel: pan to it without opening it */
  focusId?: string | null;
  /** "all", a town ("t:homewood") or a neighborhood id */
  area: string;
  /** where to look when nothing matches (Leaflet-style zoom numbers) */
  frame: { center: [number, number]; zoom: number; maxZoom: number };
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onArea: (id: AreaId) => void;
  /** extra top padding (px) so pins clear the caption box */
  topPad?: number;
};

export const LANDMARK_SVG: Record<string, string> = {
  vulcan:
    '<svg viewBox="0 0 24 32" width="16" height="22"><path fill="currentColor" d="M11 6a2.5 2.5 0 1 1 3 0l1 2 6-6 1 1-5.5 7.5L16 16l1 10h3v3H6v-3h3l1-10-2-6 3-4Z"/></svg>',
  furnace:
    '<svg viewBox="0 0 32 32" width="20" height="20"><path fill="currentColor" d="M5 30V14h4V4h3v10h3V8h3v6h3V2h3v12h3v16H5Zm4-8h3v5H9v-5Zm7 0h3v5h-3v-5Z"/></svg>',
  tree: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2 5 12h4l-4 6h6v4h2v-4h6l-4-6h4L12 2Z"/></svg>',
};

export const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

export const pinHtml = (name: string) => `<div class="pin"><span class="pin-dot"><b class="pin-n"></b></span><span class="pin-label">${esc(name)}</span></div>`;

/** Is a key press meant for the map (+/-) rather than a text field? */
export function zoomKey(e: KeyboardEvent): 1 | -1 | 0 {
  const t = e.target as HTMLElement | null;
  if (e.metaKey || e.ctrlKey || e.altKey || t?.closest?.("input, textarea, select, [contenteditable]")) return 0;
  if (e.key === "+" || e.key === "=") return 1;
  if (e.key === "-" || e.key === "_") return -1;
  return 0;
}

/**
 * Labels never sit on pins or on each other. Pins win, then the active
 * neighborhood, then other neighborhoods, then the ridge and landmarks. A label that
 * doesn't fit tries a few nearby spots, else hides until the camera moves.
 */
export function declutter(root: HTMLElement) {
  const pad = (r: DOMRect, n: number) => ({ l: r.left - n, r: r.right + n, t: r.top - n, b: r.bottom + n });
  type Box = ReturnType<typeof pad>;
  const hit = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  const taken: Box[] = [];
  root.querySelectorAll<HTMLElement>(".pin:not(.dim) .pin-dot, .pin.selected .pin-label, .pin.hot .pin-label").forEach((n) => {
    const r = n.getBoundingClientRect();
    if (r.width) taken.push(pad(r, 3));
  });
  const labels = [
    ...root.querySelectorAll<HTMLElement>(".hood.active button"),
    ...root.querySelectorAll<HTMLElement>(".hood:not(.active) button"),
    ...root.querySelectorAll<HTMLElement>(".ridge-label span, .landmark span"),
  ];
  const nudges: [number, number][] = [[0, 0], [0, 16], [0, -16], [0, 30], [0, -30], [-44, 0], [44, 0], [-44, 22], [44, -22], [0, 46], [0, -46]];
  for (const n of labels) {
    n.style.translate = "";
    const r = n.getBoundingClientRect();
    if (!r.width) continue;
    const base = pad(r, 2);
    let placed: Box | null = null;
    for (const [dx, dy] of nudges) {
      const box = { l: base.l + dx, r: base.r + dx, t: base.t + dy, b: base.b + dy };
      if (!taken.some((t) => hit(box, t))) {
        placed = box;
        if (dx || dy) n.style.translate = `${dx}px ${dy}px`;
        break;
      }
    }
    n.classList.toggle("crowded", !placed);
    if (placed) taken.push(placed);
  }
}
