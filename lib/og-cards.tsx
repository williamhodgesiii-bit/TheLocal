/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { ImageResponse } from "next/og";
import { SPOTS, SPOT_BY_ID, type Spot } from "./data";
import { NEWSLETTER } from "./brand";
import { SLOTS, letterFor, thursdayOf, weekLabel } from "./letter";
import { letterRow, memberCard } from "./live";
import type { Guide } from "./guides";
import { C, Frame, Matchbook, OG_CACHE, OG_SIZE, cut, ogFonts, whereOf } from "./og";

const SLOT_SHORT: Record<string, string> = { fine: "Fine dining", casual: "Casual", wild: "Wildcard" };

/** the week's three (the front page and The Thursday Plate): the picture changes every Thursday */
export async function weekImage(week = thursdayOf(new Date()), opts: { title?: string; foot?: string } = {}) {
  const [fonts, row] = await Promise.all([ogFonts(), letterRow(week)]);
  const letter = letterFor(week, SPOTS, row);
  const picks = SLOTS.flatMap((s) => (letter.picks[s.id] ? [{ slot: s.id, spot: letter.picks[s.id]! }] : []));
  return new ImageResponse(
    (
      <Frame foot={opts.foot ?? "theplatenextdoor.com"} motto="Three new picks every Thursday.">
        <div style={{ display: "flex", flex: 1, gap: 40, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 470, gap: 16 }}>
            {opts.title ? (
              <div style={{ display: "flex", fontFamily: "News", fontWeight: 600, fontSize: 66, lineHeight: 1.02, color: C.ink }}>{opts.title}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", fontFamily: "News", fontWeight: 600, fontSize: 64, lineHeight: 1.02, color: C.ink }}>
                <div style={{ display: "flex" }}>Skip the chains.</div>
                <div style={{ display: "flex", color: C.red }}>Eat next door.</div>
              </div>
            )}
            <div style={{ display: "flex", fontFamily: "News", fontSize: 25, lineHeight: 1.3, color: C.ink2 }}>
              {`${SPOTS.length} locally owned restaurants, coffee shops and bars around Birmingham. Reviewed by neighbors. Nobody pays to rank.`}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
            <div style={{ display: "flex", fontSize: 17, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: C.red }}>
              {`${NEWSLETTER} · ${weekLabel(week, { month: "long", day: "numeric" })}`}
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              {picks.map(({ slot, spot }) => (
                <div key={slot} style={{ display: "flex", flexDirection: "column", gap: 8, width: 152 }}>
                  <Matchbook spot={spot} w={152} h={206} />
                  <div style={{ display: "flex", fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.muted }}>{SLOT_SHORT[slot]}</div>
                  <div style={{ display: "flex", fontFamily: "News", fontWeight: 600, fontSize: 22, lineHeight: 1.1, color: C.ink }}>{cut(spot.name, 26)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts, headers: OG_CACHE }
  );
}

/** a best-of or neighborhood guide: its title, its top five, and the first pick's matchbook */
export async function guideImage(g: Guide, path: string) {
  const fonts = await ogFonts();
  const spots = g.spots();
  const top = spots.slice(0, 5);
  const lead = spots[0];
  const titleSize = g.title.length <= 30 ? 60 : g.title.length <= 44 ? 52 : 44;
  return new ImageResponse(
    (
      <Frame foot={`theplatenextdoor.com${path}`} tag={g.kind === "neighborhood" || g.kind === "town" ? "Neighborhood guide" : "Best of Birmingham"}>
        <div style={{ display: "flex", flex: 1, gap: 44, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
            <div style={{ display: "flex", fontFamily: "News", fontWeight: 600, fontSize: titleSize, lineHeight: 1.04, color: C.ink }}>{g.title}</div>
            <div style={{ display: "flex", fontSize: 19, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: C.red }}>
              {`${spots.length} locally owned places · no chains`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {top.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                  <div style={{ display: "flex", width: 30, fontFamily: "Sign", fontWeight: 900, fontSize: 32, color: C.red }}>{String(i + 1)}</div>
                  <div style={{ display: "flex", fontFamily: "News", fontWeight: 600, fontSize: 30, color: C.ink }}>{cut(s.name, 30)}</div>
                  <div style={{ display: "flex", fontSize: 18, color: C.muted }}>{whereOf(s)}</div>
                </div>
              ))}
            </div>
          </div>
          {lead && <Matchbook spot={lead} w={270} h={360} />}
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts, headers: OG_CACHE }
  );
}

/** a member's page: their name, their passport count, their Top 4 (only what their page shows anyone) */
export async function memberImage(handle: string) {
  const [fonts, m] = await Promise.all([ogFonts(), memberCard(handle)]);
  const name = m?.name ?? `@${handle}`;
  const top = (m?.top ?? []).map((id) => SPOT_BY_ID[id]).filter(Boolean) as Spot[];
  const initial = name.replace(/^@/, "").charAt(0).toUpperCase() || "P";
  return new ImageResponse(
    (
      <Frame foot={`theplatenextdoor.com/u/${m?.handle ?? handle}`} tag="Plate Passport">
        <div style={{ display: "flex", flex: 1, gap: 44, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              {m?.avatar ? (
                <img src={m.avatar} width={132} height={132} style={{ width: 132, height: 132, borderRadius: 66, objectFit: "cover", border: `3px solid ${C.ink}` }} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 132, height: 132, borderRadius: 66, background: "#4A3B6B", color: C.card, fontFamily: "News", fontSize: 68 }}>{initial}</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", fontFamily: "News", fontWeight: 600, fontSize: name.length > 18 ? 48 : 60, lineHeight: 1.02, color: C.ink }}>{cut(name, 28)}</div>
                {m && <div style={{ display: "flex", fontSize: 24, color: C.muted }}>{`@${m.handle}`}</div>}
              </div>
            </div>
            {m && !m.private ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {m.stamps > 0 && (
                  <div style={{ display: "flex", fontFamily: "News", fontSize: 34, color: C.ink }}>{`${m.stamps} of ${SPOTS.length} local plates stamped`}</div>
                )}
                {m.reviews > 0 && <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: C.red }}>{`${m.reviews} review${m.reviews === 1 ? "" : "s"} of Birmingham's own`}</div>}
              </div>
            ) : (
              <div style={{ display: "flex", fontFamily: "News", fontSize: 30, color: C.ink2 }}>Eating local around Birmingham.</div>
            )}
          </div>
          {top.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: C.muted }}>Top 4</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, width: 312 }}>
                {top.map((s) => (
                  <Matchbook key={s.id} spot={s} w={150} h={176} />
                ))}
              </div>
            </div>
          )}
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts, headers: OG_CACHE }
  );
}

export const weekAlt = (week: string) => {
  const l = letterFor(week, SPOTS, null);
  const names = SLOTS.map((s) => l.picks[s.id]?.name).filter(Boolean);
  return `${NEWSLETTER} for ${weekLabel(week, { month: "long", day: "numeric" })}: ${names.join(", ")}. Locally owned places in Birmingham.`;
};
export const guideAlt = (g: Guide) => `${g.title}: ${g.spots().slice(0, 3).map((s) => s.name).join(", ")} and more, all locally owned.`;
