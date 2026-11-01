"use client";

import { honorsOf } from "@/lib/honors";

/** Awards, small and sourced. */
export function Honors({ id, max = 3 }: { id: string; max?: number }) {
  const list = honorsOf(id).slice(0, max);
  if (!list.length) return null;
  return (
    <ul className="honors">
      {list.map((h) => (
        <li key={h.label + h.year} className={`honor honor-${h.kind}`}>
          <a href={h.source} target="_blank" rel="noreferrer" title={h.who ? `${h.label}, ${h.who}, ${h.year}` : `${h.label}, ${h.year}`}>
            {h.label} {h.year}
            {h.who ? ` · ${h.who}` : ""}
          </a>
        </li>
      ))}
    </ul>
  );
}
