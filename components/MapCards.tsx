"use client";

import { useEffect, useRef } from "react";
import { areaLabelOf, priceLabel, type Spot } from "@/lib/data";

/**
 * Mobile map tab: a swipeable strip of cards along the bottom of the map.
 * The card in the middle steers the map; tapping one opens it.
 */
export default function MapCards({
  list,
  focusId,
  onFocus,
  onOpen,
}: {
  list: Spot[];
  focusId: string | null;
  onFocus: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const t = useRef<ReturnType<typeof setTimeout>>();

  // scrolling settles → whichever card is centered becomes the focus
  function onScroll() {
    clearTimeout(t.current);
    t.current = setTimeout(() => {
      const el = strip.current;
      if (!el) return;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best: { id: string; d: number } | null = null;
      el.querySelectorAll<HTMLElement>("[data-id]").forEach((c) => {
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (!best || d < best.d) best = { id: c.dataset.id!, d };
      });
      if (best) onFocus((best as { id: string }).id);
    }, 120);
  }

  // a pin tapped elsewhere → bring its card into view
  useEffect(() => {
    if (!focusId || !strip.current) return;
    const c = strip.current.querySelector<HTMLElement>(`[data-id="${CSS.escape(focusId)}"]`);
    if (!c) return;
    const target = c.offsetLeft - (strip.current.clientWidth - c.offsetWidth) / 2;
    if (Math.abs(strip.current.scrollLeft - target) > 20) strip.current.scrollTo({ left: target, behavior: "smooth" });
  }, [focusId]);

  if (!list.length) return null;
  return (
    <div className="map-cards" ref={strip} onScroll={onScroll}>
      {list.map((s, i) => (
        <button key={s.id} data-id={s.id} className={`mcard ${focusId === s.id ? "on" : ""}`} onClick={() => onOpen(s.id)}>
          <span className="item-no">{i + 1}</span>
          <span className="mcard-body">
            <span className="mcard-name">{s.name}</span>
            <span className="item-known">{s.knownFor}</span>
            <span className="item-meta">
              {areaLabelOf(s)} · {priceLabel(s.price)}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
