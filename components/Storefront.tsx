import { memo } from "react";
import type { Spot } from "@/lib/data";
import { hash } from "@/lib/images";

/**
 * A hand-drawn, procedurally varied storefront illustration for every spot.
 * Used until a member (or Google Places) supplies a real photo of the building.
 */
const WALLS = [
  { fill: "#8E3B2A", brick: true, trim: "#E9DCC3" },
  { fill: "#E6D8BE", brick: false, trim: "#2B2420" },
  { fill: "#5F6E4C", brick: false, trim: "#EFE3CC" },
  { fill: "#2E2925", brick: true, trim: "#C9A04A" },
  { fill: "#B9863A", brick: false, trim: "#2B2420" },
  { fill: "#38484F", brick: false, trim: "#EFE3CC" },
  { fill: "#A4532F", brick: true, trim: "#F2E7D2" },
];
const AWNINGS = ["#B23A24", "#2C5A43", "#26408B", "#DDA526", "#7A2E2E", "#22201C"];
const SKIES = [
  ["#2A2130", "#7E4136", "#E39A5B"], // dusk
  ["#14182A", "#28304A", "#4B4566"], // night
  ["#6E8EA0", "#B9C7C4", "#F1D9AE"], // golden afternoon
];

function Storefront({ spot, mini = false }: { spot: Spot; mini?: boolean }) {
  const h = hash(spot.id);
  const pick = <T,>(arr: T[], salt: number) => arr[(h >>> salt) % arr.length];
  const wall = pick(WALLS, 0);
  const awning = pick(AWNINGS, 3);
  const isDrinks = spot.genres.includes("drinks") || spot.tags.includes("late night");
  const sky = isDrinks ? SKIES[1] : pick(SKIES, 6);
  const night = sky === SKIES[1];
  const scallops = 8 + ((h >>> 9) % 4) * 2;
  const upperWindows = 3 + ((h >>> 11) % 2);
  const arched = (h >>> 13) % 2 === 0;
  const lights = isDrinks || spot.tags.some((t) => /patio|live music/.test(t));
  const uid = `sf-${spot.id}${mini ? "-m" : ""}`;
  const name = spot.name.toUpperCase();
  const fs = Math.min(46, 420 / (name.length * 0.5));
  const signW = 440;
  const textLen = name.length * fs * 0.5 > signW - 30 ? signW - 30 : undefined;
  const glow = night ? "#FFC777" : "#F6D9A0";

  const awningPath = (() => {
    const x0 = 96, x1 = 544, y0 = 214, y1 = 246;
    const w = (x1 - x0) / scallops;
    let d = `M${x0 - 10},${y0} L${x1 + 10},${y0} L${x1},${y1}`;
    for (let i = scallops; i > 0; i--) {
      const xa = x0 + i * w, xb = x0 + (i - 1) * w;
      d += ` Q${(xa + xb) / 2},${y1 + 16} ${xb},${y1}`;
    }
    return d + " Z";
  })();

  return (
    <svg
      viewBox="0 0 640 400"
      preserveAspectRatio={mini ? "xMidYMid slice" : "xMidYMid meet"}
      role="img"
      aria-label={`Illustration of ${spot.name}`}
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset=".6" stopColor={sky[1]} />
          <stop offset="1" stopColor={sky[2]} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx=".5" cy=".7" r=".8">
          <stop offset="0" stopColor={glow} stopOpacity=".95" />
          <stop offset="1" stopColor="#7A4A2A" stopOpacity=".9" />
        </radialGradient>
        <pattern id={`${uid}-brick`} width="36" height="16" patternUnits="userSpaceOnUse">
          <path d="M0 0H36M0 8H36M0 16H36M9 0V8M27 8V16" stroke="#000" strokeOpacity=".18" strokeWidth="1.4" />
        </pattern>
        <filter id={`${uid}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {/* sky & Red Mountain with a tiny Vulcan */}
      <rect width="640" height="400" fill={`url(#${uid}-sky)`} />
      {night && [40, 120, 210, 330, 470, 590, 560, 75].map((x, i) => (
        <circle key={i} cx={x} cy={22 + ((i * 37) % 60)} r={1.3} fill="#FFF6DA" opacity=".8" />
      ))}
      <circle cx={night ? 520 : 140} cy={night ? 52 : 70} r={night ? 16 : 26} fill={night ? "#F4ECDD" : "#F7C77A"} opacity={night ? 0.9 : 0.75} />
      <path d="M0 250 C120 205 220 196 330 210 C430 222 520 186 640 200 V400 H0Z" fill="#000" opacity=".22" />
      <g transform="translate(588 168)" fill="#000" opacity=".35">
        <rect x="-3" y="10" width="6" height="22" />
        <circle cx="0" cy="6" r="4" />
        <path d="M2 10 L14 -2 L15 0 L4 14Z" />
      </g>

      {/* building */}
      <rect x="80" y="74" width="480" height="292" fill={wall.fill} />
      {wall.brick && <rect x="80" y="74" width="480" height="292" fill={`url(#${uid}-brick)`} />}
      <rect x="70" y="62" width="500" height="18" fill={wall.trim} />
      {Array.from({ length: 24 }, (_, i) => (
        <rect key={i} x={78 + i * 20.5} y="80" width="9" height="7" fill={wall.trim} opacity=".8" />
      ))}

      {/* sign */}
      <rect x={320 - signW / 2} y="100" width={signW} height="62" rx="4" fill="#1C1714" stroke={wall.trim} strokeWidth="3" />
      <text
        x="320"
        y={131 + fs * 0.34}
        textAnchor="middle"
        fontFamily="'Big Shoulders Display', 'Arial Narrow', sans-serif"
        fontWeight={800}
        fontSize={fs}
        letterSpacing="2"
        fill={night ? "#FFD58A" : "#F4ECDD"}
        textLength={textLen}
        lengthAdjust={textLen ? "spacingAndGlyphs" : undefined}
        style={night ? { filter: "drop-shadow(0 0 6px rgba(255,190,90,.8))" } : undefined}
      >
        {name}
      </text>

      {/* upper windows */}
      {Array.from({ length: upperWindows }, (_, i) => {
        const w = 52, gap = (440 - upperWindows * w) / (upperWindows - 1);
        const x = 100 + i * (w + gap);
        return (
          <g key={i}>
            {arched ? (
              <path d={`M${x},208 V184 a${w / 2},${w / 2} 0 0 1 ${w},0 V208Z`} fill={night ? glow : "#2B3A44"} opacity={night ? 0.85 : 0.75} transform="translate(0 -12)" />
            ) : (
              <rect x={x} y="172" width={w} height="26" fill={night ? glow : "#2B3A44"} opacity={night ? 0.85 : 0.75} />
            )}
            <rect x={x - 4} y="198" width={w + 8} height="5" fill={wall.trim} />
          </g>
        );
      })}

      {/* storefront */}
      <rect x="96" y="246" width="448" height="120" fill="#1C1714" />
      <rect x="108" y="262" width="150" height="96" fill={`url(#${uid}-glow)`} />
      <rect x="382" y="262" width="150" height="96" fill={`url(#${uid}-glow)`} />
      <path d="M108 310H258M183 262V358M382 310H532M457 262V358" stroke="#1C1714" strokeWidth="4" />
      {/* tables & people silhouettes */}
      <g fill="#2B1C14" opacity=".55">
        <circle cx="150" cy="328" r="8" />
        <rect x="140" y="336" width="20" height="22" rx="4" />
        <rect x="170" y="340" width="40" height="5" />
        <circle cx="490" cy="326" r="8" />
        <rect x="480" y="334" width="20" height="24" rx="4" />
      </g>
      {/* door */}
      <rect x="282" y="256" width="76" height="110" fill={awning} />
      <rect x="292" y="268" width="56" height="58" fill={`url(#${uid}-glow)`} />
      <circle cx="346" cy="336" r="3.5" fill="#C9A04A" />
      {(spot.genres.includes("coffee") || isDrinks) && (
        <g>
          <rect x="398" y="272" width="56" height="22" rx="11" fill="none" stroke="#FF6A4A" strokeWidth="2.5" style={{ filter: "drop-shadow(0 0 5px #ff6a4a)" }} />
          <text x="426" y="288" textAnchor="middle" fontFamily="'Big Shoulders Display', sans-serif" fontWeight={800} fontSize="15" fill="#FF8A6A" style={{ filter: "drop-shadow(0 0 4px #ff6a4a)" }}>
            OPEN
          </text>
        </g>
      )}

      {/* awning */}
      <clipPath id={`${uid}-awn`}>
        <path d={awningPath} />
      </clipPath>
      <g clipPath={`url(#${uid}-awn)`}>
        <rect x="80" y="200" width="480" height="70" fill="#F2E7D2" />
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={i} x={86 + i * 30} y="200" width="15" height="70" fill={awning} />
        ))}
        <rect x="80" y="214" width="480" height="6" fill="#000" opacity=".2" />
      </g>

      {/* string lights */}
      {lights && (
        <g>
          <path d="M80 250 Q200 290 320 252 Q440 290 560 250" stroke="#2B2420" strokeWidth="1.5" fill="none" />
          {Array.from({ length: 13 }, (_, i) => {
            const t = i / 12;
            const seg = t < 0.5 ? t * 2 : (t - 0.5) * 2;
            const x = 80 + t * 480;
            const y = 250 + 4 * 19 * seg * (1 - seg) + 2;
            return <circle key={i} cx={x} cy={y} r="3.6" fill="#FFD58A" style={{ filter: "drop-shadow(0 0 4px #ffcf70)" }} />;
          })}
        </g>
      )}

      {/* sidewalk + planters */}
      <rect x="0" y="366" width="640" height="34" fill="#3A322C" />
      <rect x="0" y="366" width="640" height="4" fill="#000" opacity=".3" />
      {[262, 366].map((x) => (
        <g key={x}>
          <rect x={x} y="344" width="14" height="22" fill="#6E4B34" />
          <circle cx={x + 7} cy="338" r="13" fill="#4F6B3E" />
          <circle cx={x + 2} cy="332" r="7" fill="#6F8A55" />
        </g>
      ))}

      <rect width="640" height="400" filter={`url(#${uid}-grain)`} opacity=".55" />
    </svg>
  );
}

export default memo(Storefront);
