"use client";

import { memo, useMemo } from "react";
import { AREAS, RED_MOUNTAIN, type Spot } from "@/lib/data";

const W = 400;
const H = 220;
/** how much of town shows around the place, km from the middle to each side */
const HALF_KM = 1.5;

/**
 * A little printed locator, like the inset on a paper menu: the place, its neighbors, the
 * neighborhood names and Red Mountain, drawn in the page's own ink. No map tiles to download,
 * so it's instant; "Directions" opens real maps.
 */
export default memo(function LocatorMap({ spot, pool, onSelect }: { spot: Spot; pool: Spot[]; onSelect?: (id: string) => void }) {
  const { x, y, near, labels, ridge } = useMemo(() => {
    const [lat0, lng0] = spot.coords;
    const kx = 111.32 * Math.cos((lat0 * Math.PI) / 180);
    const scale = W / 2 / HALF_KM;
    const x = (lng: number) => W / 2 + (lng - lng0) * kx * scale;
    const y = (lat: number) => H / 2 - (lat - lat0) * 110.57 * scale;
    const inView = (c: [number, number], pad = 0) => {
      const px = x(c[1]);
      const py = y(c[0]);
      return px > -pad && px < W + pad && py > -pad && py < H + pad;
    };
    const near = pool.filter((s) => s.id !== spot.id && inView(s.coords, 6)).slice(0, 60);
    const labels = AREAS.filter((a) => inView(a.labelAt, -20));
    const ridge = RED_MOUNTAIN.map(([la, ln]) => `${x(ln).toFixed(1)},${y(la).toFixed(1)}`).join(" ");
    return { x, y, near, labels, ridge };
  }, [spot, pool]);

  const px = x(spot.coords[1]);
  const py = y(spot.coords[0]);
  return (
    <svg className="locator" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map: where ${spot.name} is`}>
      <defs>
        {/* Birmingham's streets run on a tilted grid */}
        <pattern id="loc-grid" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-36)">
          <path d="M0 0H22M0 0V22" stroke="currentColor" strokeOpacity=".09" strokeWidth="1" fill="none" />
        </pattern>
      </defs>
      <rect width={W} height={H} className="loc-bg" />
      <rect width={W} height={H} fill="url(#loc-grid)" className="loc-grid" />
      <polyline points={ridge} className="loc-ridge" />
      {labels.map((a) => (
        <text key={a.id} x={x(a.labelAt[1])} y={y(a.labelAt[0])} className="loc-label" textAnchor="middle">
          {a.label.split(" & ")[0].toUpperCase()}
        </text>
      ))}
      {near.map((s) => (
        <circle
          key={s.id}
          cx={x(s.coords[1])}
          cy={y(s.coords[0])}
          r={4}
          className="loc-dot"
          onClick={onSelect ? () => onSelect(s.id) : undefined}
          role={onSelect ? "link" : undefined}
          aria-label={onSelect ? s.name : undefined}
        >
          <title>{s.name}</title>
        </circle>
      ))}
      <g transform={`translate(${px} ${py}) scale(1.35)`} className="loc-pin">
        <circle r="16" className="loc-halo" />
        <path d="M0 2c-5-6-8-9.5-8-14a8 8 0 0 1 16 0c0 4.5-3 8-8 14Z" transform="translate(0 -2)" />
        <circle cy="-14" r="3" className="loc-pin-c" />
      </g>
    </svg>
  );
});
