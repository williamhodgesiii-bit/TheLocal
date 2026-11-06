/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
/**
 * Share cards: the picture people see when a link to the site is posted in a text, on Instagram
 * stories, Facebook, Slack, iMessage, X or in search. Drawn on the server (next/og), 1200×630, in
 * the site's own type and inks, so every shared link looks like it came from us, not a template.
 *
 * Only flexbox and inline styles work here (it's Satori, not a browser). Fonts are static .woff
 * copies of the site's own (assets/og, SIL Open Font License).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { GENRE_BY_ID, areaLabelOf, type Spot } from "./data";
import { inksFor } from "./inks";
import { HOUSE_PHOTOS } from "./photos";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";
/** drawn once, then served from the CDN; refreshed hourly in the background (ratings, the week's picks) */
export const OG_CACHE = { "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" };

export const C = {
  paper: "#F4EFE1",
  card: "#FBF8F0",
  ink: "#22201C",
  ink2: "#3A3731",
  muted: "#6C665A",
  red: "#B23A24",
  green: "#2C5A43",
  mustard: "#E0AE45",
  line: "rgba(34,32,28,0.16)",
};

type Font = { name: string; data: ArrayBuffer; weight: 400 | 500 | 600 | 700 | 900; style: "normal" | "italic" };
let fonts: Promise<Font[]> | null = null;
const FONT_FILES: [string, Font["name"], Font["weight"], Font["style"]][] = [
  ["newsreader-latin-400-normal.woff", "News", 400, "normal"],
  ["newsreader-latin-400-italic.woff", "News", 400, "italic"],
  ["newsreader-latin-600-normal.woff", "News", 600, "normal"],
  ["libre-franklin-latin-500-normal.woff", "Franklin", 500, "normal"],
  ["libre-franklin-latin-700-normal.woff", "Franklin", 700, "normal"],
  ["big-shoulders-display-latin-900-normal.woff", "Sign", 900, "normal"],
  ["yellowtail-latin-400-normal.woff", "Script", 400, "normal"],
];

/** the fonts, read once per server instance */
export function ogFonts(): Promise<Font[]> {
  fonts ??= Promise.all(
    FONT_FILES.map(async ([file, name, weight, style]) => {
      const buf = await readFile(join(process.cwd(), "assets/og", file));
      return { name, weight, style, data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer };
    })
  );
  return fonts;
}

/** a place's own photo from our folder (when an owner sent one), as a data URI the renderer can draw */
export async function housePhoto(spot: Spot): Promise<string | null> {
  const h = HOUSE_PHOTOS[spot.id]?.[0];
  if (!h || !h.src.startsWith("/photos/")) return null;
  try {
    const buf = await readFile(join(process.cwd(), "public", h.src));
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export const cut = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/[\s,.;:&-]+\S*$/, "")}…`);
export const kindOf = (s: Spot) => GENRE_BY_ID[s.genres[0]]?.label ?? "Restaurant";
export const whereOf = (s: Spot) => areaLabelOf(s).split(" & ")[0];
export const priceOf = (s: Spot) => "$".repeat(Math.max(1, Math.min(4, s.price || 1)));

export function PlateMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="22.6" fill={C.card} stroke={C.ink} strokeWidth="1.8" />
      <circle cx="24" cy="24" r="18.4" fill="none" stroke={C.red} strokeWidth="2.8" />
      <path d="M17.2 33.4V22.6a6.8 6.8 0 0 1 13.6 0v10.8" fill="none" stroke={C.ink} strokeWidth="1.5" />
      <path d="M19.2 33.4V22.8a4.8 4.8 0 0 1 9.6 0v10.6Z" fill={C.red} />
      <path d="M20.6 22.6a3.4 3.4 0 0 1 6.8 0Z" fill={C.card} />
      <circle cx="26.4" cy="28.6" r="1.1" fill={C.card} />
      <path d="M15.4 33.8h17.2" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Stars({ value, size = 26 }: { value: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = value >= n - 0.25 ? C.red : value >= n - 0.75 ? "half" : "#E3DBC5";
        return (
          <svg key={n} width={size} height={size} viewBox="0 0 24 24">
            {fill === "half" ? (
              <>
                <defs>
                  <linearGradient id={`h${n}`}>
                    <stop offset="50%" stopColor={C.red} />
                    <stop offset="50%" stopColor="#E3DBC5" />
                  </linearGradient>
                </defs>
                <path d="M12 2.5l2.9 6.2 6.8.8-5 4.6 1.4 6.7L12 17.4l-6.1 3.4 1.4-6.7-5-4.6 6.8-.8z" fill={`url(#h${n})`} />
              </>
            ) : (
              <path d="M12 2.5l2.9 6.2 6.8.8-5 4.6 1.4 6.7L12 17.4l-6.1 3.4 1.4-6.7-5-4.6 6.8-.8z" fill={fill} />
            )}
          </svg>
        );
      })}
    </div>
  );
}

/** the card every share image sits on: paper, an inked border, the brand up top, the address below */
export function Frame({ children, foot, tag = "Locally owned · Birmingham, Ala.", motto = "Skip the chains. Eat next door." }: { children: ReactNode; foot: string; tag?: string; motto?: string }) {
  return (
    <div style={{ width: 1200, height: 630, display: "flex", background: C.paper, padding: 26, fontFamily: "Franklin" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.card, border: `2px solid ${C.ink}`, padding: "28px 48px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <PlateMark size={46} />
            <div style={{ display: "flex", fontFamily: "Script", fontSize: 40, color: C.red, marginTop: -4 }}>The Plate Next Door</div>
          </div>
          <div style={{ display: "flex", fontSize: 16, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: C.ink2 }}>{tag}</div>
        </div>
        <div style={{ flex: 1, display: "flex", paddingTop: 22, paddingBottom: 18 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${C.ink}`, paddingTop: 14 }}>
          <div style={{ display: "flex", fontSize: 21, fontWeight: 700, color: C.ink }}>{foot}</div>
          <div style={{ display: "flex", fontFamily: "News", fontStyle: "italic", fontSize: 24, color: C.ink2 }}>{motto}</div>
        </div>
      </div>
    </div>
  );
}

/** split a name into at most three balanced lines for the matchbook face */
function lines(name: string): string[] {
  const words = name.toUpperCase().split(/\s+/);
  if (name.length <= 11 || words.length === 1) return [words.join(" ")];
  const target = name.length > 24 && words.length > 2 ? 3 : 2;
  const out: string[] = [];
  let line = "";
  const per = name.length / target;
  for (const w of words) {
    if (line && (line + " " + w).length > per + 3 && out.length < target - 1) {
      out.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  out.push(line);
  return out;
}

/** a place's matchbook, in the same inks as its cover on the site (or its own photo, when we have one) */
export function Matchbook({ spot, w, h, photo }: { spot: Spot; w: number; h: number; photo?: string | null }) {
  const [bg, fg, ac] = inksFor(spot.id);
  const ls = lines(spot.sign ?? spot.name);
  const longest = Math.max(...ls.map((l) => l.length));
  const size = Math.max(22, Math.min(w * 0.3, (w - 44) / (longest * 0.5)));
  const strike = Math.round(h * 0.085);
  if (photo)
    return (
      <div style={{ width: w, height: h, display: "flex", position: "relative", borderRadius: 10, overflow: "hidden", border: `2px solid ${C.ink}` }}>
        <img src={photo} width={w} height={h} style={{ position: "absolute", top: 0, left: 0, width: w, height: h, objectFit: "cover" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h * 0.55, display: "flex", backgroundImage: "linear-gradient(to bottom, rgba(20,18,16,0) 0%, rgba(20,18,16,0.85) 100%)" }} />
        <div style={{ position: "absolute", left: 22, right: 22, bottom: 20, display: "flex", flexDirection: "column", color: "#FBF8F0" }}>
          <div style={{ display: "flex", fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>{whereOf(spot)}</div>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Sign", fontWeight: 900, fontSize: size * 0.8, lineHeight: 0.9 }}>
            {ls.map((l) => (
              <div key={l} style={{ display: "flex" }}>
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", background: bg, borderRadius: 10, border: `2px solid ${C.ink}`, overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: `${Math.round(h * 0.07)}px 18px`, color: fg, textAlign: "center" }}>
        <div style={{ display: "flex", fontSize: Math.max(12, w * 0.05), fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: ac }}>{whereOf(spot)}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Sign", fontWeight: 900, fontSize: size, lineHeight: 0.88 }}>
          {ls.map((l) => (
            <div key={l} style={{ display: "flex" }}>
              {l}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: Math.max(12, w * 0.048), fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>{GENRE_BY_ID[spot.genres[0]]?.short ?? ""}</div>
      </div>
      <div style={{ height: strike, display: "flex", background: ac, borderTop: `2px solid ${C.ink}` }} />
    </div>
  );
}
