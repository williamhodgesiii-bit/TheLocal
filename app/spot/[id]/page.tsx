import type { Metadata } from "next";
import Explorer from "@/components/Explorer";
import JsonLd from "@/components/JsonLd";
import { permanentRedirect } from "next/navigation";
import { GENRE_BY_ID, SPOTS, SPOT_ALIASES, SPOT_BY_ID, areaLabelOf, type Spot } from "@/lib/data";
import { CITY_BY_ID, cityPath } from "@/lib/regions";
import { fetchCommunitySpot } from "@/lib/server-spots";
import { honorsOf } from "@/lib/honors";
import { ratingFor, reviewsFor } from "@/lib/live";
import { breadcrumbLd, getThe, spotLd } from "@/lib/seo";

export const dynamicParams = true;
export const revalidate = 3600;

async function resolve(id: string): Promise<Spot | null> {
  return SPOT_BY_ID[id] ?? (await fetchCommunitySpot(id));
}

export function generateStaticParams() {
  return SPOTS.map((s) => ({ id: s.id }));
}

function crumbsFor(s: Spot) {
  const city = CITY_BY_ID[s.city];
  const items = [{ name: "Home", path: "/" }];
  if (city && cityPath(city) !== "/") items.push({ name: city.name, path: cityPath(city) });
  items.push({ name: s.name, path: `/spot/${s.id}` });
  return items;
}

/** "…" at a word boundary, for descriptions that fit a search result (about 155 characters) */
const fit = (t: string, n = 158) => (t.length <= n ? t : `${t.slice(0, n - 1).replace(/[\s,.;:–-]+\S*$/, "")}…`);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const s = await resolve(params.id);
  if (!s) return { title: "Spot", robots: { index: false } };
  const city = CITY_BY_ID[s.city]?.name ?? "Birmingham";
  const kind = GENRE_BY_ID[s.genres[0]]?.label ?? "Restaurant";
  const where = areaLabelOf(s).split(" & ")[0];
  const title = `${s.name}: ${kind} in ${where}, ${city}`;
  const rating = await ratingFor(s.id);
  const honor = honorsOf(s.id)[0];
  // what someone deciding where to eat wants first: how locals rate it, what to order, why it's good
  const lead = rating && rating.count > 0 ? `Rated ${rating.avg.toFixed(1)}/5 by ${rating.count} local${rating.count === 1 ? "" : "s"}. ` : honor ? `${honor.label} ${honor.year}. ` : "";
  const description = fit(`${lead}${getThe(s.knownFor)}. ${s.blurb}`);
  return {
    title,
    description,
    alternates: { canonical: `/spot/${s.id}` },
    openGraph: { title: `${s.name} · ${where}`, description, url: `/spot/${s.id}`, type: "website" },
    twitter: { title: `${s.name} · ${where}`, description },
  };
}

export default async function SpotPage({ params }: { params: { id: string } }) {
  // places once listed per location now have one page
  if (SPOT_ALIASES[params.id]) permanentRedirect(`/spot/${SPOT_ALIASES[params.id]}`);
  const s = await resolve(params.id);
  // Unknown here can still be a demo-mode spot stored in the visitor's browser — let the client resolve it.
  if (!s) return <Explorer initialSpot={params.id} />;
  const [rating, reviews] = await Promise.all([ratingFor(s.id), reviewsFor(s.id, 3)]);
  return (
    <>
      <JsonLd data={[spotLd(s, { rating, reviews }), breadcrumbLd(crumbsFor(s))]} />
      <Explorer cityId={s.city} initialSpot={s.id} initialSpotData={SPOT_BY_ID[s.id] ? undefined : s} />
    </>
  );
}
