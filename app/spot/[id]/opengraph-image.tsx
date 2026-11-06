import { ImageResponse } from "next/og";
import { SPOT_BY_ID, canonicalSpotId } from "@/lib/data";
import { honorsOf } from "@/lib/honors";
import { ratingFor } from "@/lib/live";
import { C, Frame, Matchbook, OG_CACHE, OG_SIZE, OG_TYPE, Stars, cut, housePhoto, kindOf, ogFonts, priceOf, whereOf } from "@/lib/og";
import { fetchCommunitySpot } from "@/lib/server-spots";

export const runtime = "nodejs";
export const revalidate = 3600;

async function find(id: string) {
  const c = canonicalSpotId(id);
  return SPOT_BY_ID[c] ?? (await fetchCommunitySpot(c));
}

/** one card per place, with alt text that says what's on it */
export async function generateImageMetadata({ params }: { params: { id: string } }) {
  const s = await find(params.id);
  // a new review count means a new address, so shared previews show the current rating
  const r = s ? await ratingFor(s.id) : null;
  return [{ id: `card-${r?.count ?? 0}`, size: OG_SIZE, contentType: OG_TYPE, alt: s ? `${s.name}: ${kindOf(s)} in ${whereOf(s)}, Birmingham. ${s.knownFor}.` : "A locally owned place on The Plate Next Door" }];
}

export default async function Image({ params }: { params: { id: string } }) {
  const s = await find(params.id);
  const fonts = await ogFonts();
  if (!s)
    return new ImageResponse(
      (
        <Frame foot="theplatenextdoor.com">
          <div style={{ display: "flex", alignItems: "center", fontFamily: "News", fontWeight: 600, fontSize: 72, color: C.ink }}>Skip the chains. Eat next door.</div>
        </Frame>
      ),
      { ...OG_SIZE, fonts, headers: OG_CACHE }
    );
  const [rating, photo] = await Promise.all([ratingFor(s.id), housePhoto(s)]);
  const honor = honorsOf(s.id)[0];
  const name = s.name;
  const nameSize = name.length <= 14 ? 78 : name.length <= 22 ? 62 : 50;
  return new ImageResponse(
    (
      <Frame foot={`theplatenextdoor.com/spot/${s.id}`}>
        <div style={{ display: "flex", flex: 1, gap: 46, alignItems: "stretch" }}>
          <Matchbook spot={s} w={330} h={392} photo={photo} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 14 }}>
            <div style={{ display: "flex", fontSize: 19, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: C.red }}>
              {`${kindOf(s)} · ${whereOf(s)} · ${priceOf(s)}`}
            </div>
            <div style={{ display: "flex", fontFamily: "News", fontWeight: 600, fontSize: nameSize, lineHeight: 1.02, color: C.ink }}>{name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
              <div style={{ display: "flex", fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: C.muted }}>The order</div>
              <div style={{ display: "flex", fontFamily: "News", fontStyle: "italic", fontSize: 34, lineHeight: 1.15, color: C.ink2 }}>{cut(s.knownFor, 64)}</div>
            </div>
            {honor && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 21, fontWeight: 700, color: C.green }}>
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path d="M12 2.5l2.9 6.2 6.8.8-5 4.6 1.4 6.7L12 17.4l-6.1 3.4 1.4-6.7-5-4.6 6.8-.8z" fill={C.green} />
                </svg>
                {`${honor.label} ${honor.year}`}
              </div>
            )}
            {rating && rating.count > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
                <Stars value={rating.avg} size={30} />
                <div style={{ display: "flex", fontSize: 25, fontWeight: 700, color: C.ink }}>
                  {`${rating.avg.toFixed(1)} · ${rating.count} local review${rating.count === 1 ? "" : "s"}`}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", fontFamily: "News", fontSize: 24, lineHeight: 1.3, color: C.muted, marginTop: 4 }}>{cut(s.blurb, 120)}</div>
            )}
          </div>
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts, headers: OG_CACHE }
  );
}
