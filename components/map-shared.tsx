import { distanceKm, type Area, type AreaId, type Spot } from "@/lib/data";
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

/**
 * The pins to frame the map on. A few places far out of town (Alabaster, Dickey Springs) would
 * otherwise zoom the whole city out to a speck, so with five or more pins, anything more than
 * 15 km from the middle of them is left out of the frame (its pin is still on the map).
 */
export function framePoints(pts: [number, number][]): [number, number][] {
  if (pts.length < 5) return pts;
  const mid = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
  const c: [number, number] = [mid(pts.map((p) => p[0])), mid(pts.map((p) => p[1]))];
  const near = pts.filter((p) => distanceKm(p, c) <= 15);
  return near.length >= 2 ? near : pts;
}

export const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * Click handler for things printed on the map (pins, neighborhood names). The map can be
 * dragged from anywhere, pins included, so a press that travels is a drag, not a tap.
 */
export function onTap(node: HTMLElement, fn: () => void) {
  let x = 0;
  let y = 0;
  node.addEventListener("pointerdown", (e) => {
    x = e.clientX;
    y = e.clientY;
  });
  node.addEventListener("click", (e) => {
    e.stopPropagation();
    if (Math.hypot(e.clientX - x, e.clientY - y) > 6) return;
    fn();
  });
}

/** Shown once someone has dragged or zoomed the map: puts it back on their picks. */
export function Recenter({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`recenter ${show ? "show" : ""}`} onClick={onClick} aria-label="Recenter the map on your picks" tabIndex={show ? 0 : -1} aria-hidden={!show}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span>Recenter</span>
    </button>
  );
}

/** The name printed beside a pin: no "(West Homewood)" tail, since the map already shows where it is. */
export const mapName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, "") || name;

export const pinHtml = (name: string) =>
  `<div class="pin"><span class="pin-dot"><b class="pin-n"></b></span><span class="pin-name" aria-hidden="true">${esc(mapName(name))}</span><span class="pin-label">${esc(name)}</span></div>`;

/** Names print beside the pins from this zoom in (Leaflet numbers), wherever they fit. */
export const NAME_ZOOM = 14;

export type NameSide = "r" | "l" | "b" | "t";
export type ScreenBox = { l: number; r: number; t: number; b: number };
/** a pin that wants its name shown: where it is on screen, the size of its name, and its place in line */
export type NameCandidate = { id: string; x: number; y: number; w: number; h: number; rank: number; prev?: NameSide };

const SIDES: NameSide[] = ["r", "l", "b", "t"];
// matches the .pin-name offsets in globals.css
const SIDE_GAP = 15;
const TOP_GAP = 13;
/** a pin's dot, as room a name can't take */
export const dotBox = (x: number, y: number): ScreenBox => ({ l: x - 12, r: x + 12, t: y - 12, b: y + 12 });
const overlaps = (a: ScreenBox, b: ScreenBox) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

function nameBox(c: NameCandidate, side: NameSide): ScreenBox {
  if (side === "r") return { l: c.x + SIDE_GAP, r: c.x + SIDE_GAP + c.w, t: c.y - c.h / 2, b: c.y + c.h / 2 };
  if (side === "l") return { l: c.x - SIDE_GAP - c.w, r: c.x - SIDE_GAP, t: c.y - c.h / 2, b: c.y + c.h / 2 };
  if (side === "b") return { l: c.x - c.w / 2, r: c.x + c.w / 2, t: c.y + TOP_GAP, b: c.y + TOP_GAP + c.h };
  return { l: c.x - c.w / 2, r: c.x + c.w / 2, t: c.y - TOP_GAP - c.h, b: c.y - TOP_GAP };
}

/**
 * Which pins get their name printed, and on which side. The best-ranked places (the top of
 * the list) claim room first; each name tries the right, then the left, below and above,
 * starting with the side it had last time so names don't hop around while you zoom. A name
 * never covers a pin, another name or the edge of the map; one that fits nowhere waits until
 * you zoom in further. Plain arithmetic on screen points, so it can run every frame.
 */
export function placeNames(cands: NameCandidate[], blocked: ScreenBox[], w: number, h: number): Map<string, NameSide> {
  const out = new Map<string, NameSide>();
  const taken = [...blocked];
  for (const c of [...cands].sort((a, b) => a.rank - b.rank)) {
    const order = c.prev ? [c.prev, ...SIDES.filter((x) => x !== c.prev)] : SIDES;
    for (const side of order) {
      const box = nameBox(c, side);
      if (box.l < 4 || box.t < 4 || box.r > w - 4 || box.b > h - 4) continue;
      if (taken.some((t) => overlaps(box, t))) continue;
      taken.push({ l: box.l - 3, r: box.r + 3, t: box.t - 2, b: box.b + 2 });
      out.set(c.id, side);
      break;
    }
  }
  return out;
}

/** Things printed over the map (caption, key, buttons, the card strip): names keep clear of them. */
const COVERS = ".map-caption, .map-key, .map-cards, .m-round, .recenter.show, .zoom-ctl, .leaflet-control-zoom, .maplibregl-ctrl-attrib, .leaflet-control-attribution";
/** Where those sit, in the map's own screen points. They hold still while the map moves, so read them once per stop. */
export function coverBoxes(host: HTMLElement): ScreenBox[] {
  const h = host.getBoundingClientRect();
  const root = host.closest(".map-plate") ?? host.parentElement ?? host;
  return [...root.querySelectorAll<HTMLElement>(COVERS)]
    .map((n) => n.getBoundingClientRect())
    .filter((r) => r.width && r.height)
    .map((r) => ({ l: r.left - h.left, r: r.right - h.left, t: r.top - h.top, b: r.bottom - h.top }));
}

/** Puts each pin's name where placeNames said, touching only the pins that changed. */
export function showNames(pins: Map<string, HTMLElement>, next: Map<string, NameSide>, prev: Map<string, NameSide>) {
  pins.forEach((pin, id) => {
    const side = next.get(id);
    if (side === prev.get(id)) return;
    pin.classList.toggle("named", !!side);
    if (side) pin.dataset.side = side;
  });
}

/** The size of each pin's name, read once (and again after the web fonts arrive). */
export function nameSize(cache: Map<string, [number, number]>, id: string, pin: Element | null | undefined): [number, number] | null {
  const have = cache.get(id);
  if (have) return have;
  const n = pin?.querySelector<HTMLElement>(".pin-name");
  if (!n || !n.offsetWidth) return null;
  const size: [number, number] = [n.offsetWidth, n.offsetHeight];
  cache.set(id, size);
  return size;
}

/** Is a key press meant for the map (+/-) rather than a text field? */
export function zoomKey(e: KeyboardEvent): 1 | -1 | 0 {
  const t = e.target as HTMLElement | null;
  if (e.metaKey || e.ctrlKey || e.altKey || t?.closest?.("input, textarea, select, [contenteditable]")) return 0;
  if (e.key === "+" || e.key === "=") return 1;
  if (e.key === "-" || e.key === "_") return -1;
  return 0;
}

/**
 * Labels never sit on pins or on each other. Pins and their names win, then the active
 * neighborhood, then other neighborhoods, then the ridge and landmarks. A label that
 * doesn't fit tries a few nearby spots, else hides until the camera moves.
 */
export function declutter(root: HTMLElement) {
  const pad = (r: DOMRect, n: number) => ({ l: r.left - n, r: r.right + n, t: r.top - n, b: r.bottom + n });
  type Box = ReturnType<typeof pad>;
  const hit = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  const labels = [
    ...root.querySelectorAll<HTMLElement>(".hood.active button"),
    ...root.querySelectorAll<HTMLElement>(".hood:not(.active) button"),
    ...root.querySelectorAll<HTMLElement>(".ridge-label span, .landmark span"),
  ];
  // writes first, then one round of reads, then the writes that place things
  for (const n of labels) n.style.translate = "";
  const taken: Box[] = [];
  root.querySelectorAll<HTMLElement>(".pin:not(.dim) .pin-dot, .pin.named .pin-name, .pin.selected .pin-label, .pin.hot .pin-label").forEach((n) => {
    const r = n.getBoundingClientRect();
    if (r.width) taken.push(pad(r, 3));
  });
  const rects = labels.map((n) => n.getBoundingClientRect());
  const nudges: [number, number][] = [[0, 0], [0, 16], [0, -16], [0, 30], [0, -30], [-44, 0], [44, 0], [-44, 22], [44, -22], [0, 46], [0, -46]];
  const out: { n: HTMLElement; at: [number, number] | null }[] = [];
  labels.forEach((n, i) => {
    const r = rects[i];
    if (!r.width) return;
    const base = pad(r, 2);
    let at: [number, number] | null = null;
    for (const [dx, dy] of nudges) {
      const box = { l: base.l + dx, r: base.r + dx, t: base.t + dy, b: base.b + dy };
      if (!taken.some((t) => hit(box, t))) {
        at = [dx, dy];
        taken.push(box);
        break;
      }
    }
    out.push({ n, at });
  });
  for (const { n, at } of out) {
    n.classList.toggle("crowded", !at);
    if (at && (at[0] || at[1])) n.style.translate = `${at[0]}px ${at[1]}px`;
  }
}
