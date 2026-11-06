import { siteUrl } from "@/lib/site";
import { BRAND, MANTRA, CHECKED, NEWSLETTER } from "@/lib/brand";
import { weekFacts } from "@/components/ThursdayView";
import { thursdayOf } from "@/lib/letter";
import { ratings } from "@/lib/live";
import { BEST_GUIDES, PLACE_GUIDES, hrefOf, publishable, type Guide } from "@/lib/guides";
import { SPOTS, SPOT_BY_ID } from "@/lib/data";
import { honorsOf } from "@/lib/honors";

// /llms.txt — a clean, factual map of the site for AI answer engines.
// Emerging convention (llmstxt.org): give LLMs the facts and the links so they
// can cite the real pages instead of guessing.

// live: this week's picks and the members' ratings change, so it's rebuilt hourly
export const revalidate = 3600;

export async function GET() {
  const base = siteUrl();
  const link = (g: Guide) => `- [${g.title.replace(/^The best /, "Best ")}](${base}${hrefOf(g)}) — ${g.spots().length} places`;
  const top = [...SPOTS].sort((a, b) => b.pop - a.pop).slice(0, 25);
  const honored = SPOTS.filter((s) => honorsOf(s.id).length);
  const [{ picks, date }, rated] = await Promise.all([weekFacts(thursdayOf(new Date())), ratings()]);
  const localFavorites = Object.entries(rated)
    .filter(([id, r]) => SPOT_BY_ID[id] && r.count >= 3)
    .sort((a, b) => b[1].avg - a[1].avg || b[1].count - a[1].count)
    .slice(0, 15);

  const text = `# ${BRAND}

> ${MANTRA} A hand-checked guide to ${SPOTS.length} locally owned restaurants, coffee shops and bars in Birmingham, Homewood, Mountain Brook and Vestavia Hills, Alabama. No chains, and nobody pays to rank. Last checked ${CHECKED}.

Home: ${base}
All guides: ${base}/best
Neighborhoods: ${base}/neighborhood
How we pick: ${base}/about
${NEWSLETTER} (three picks, every Thursday): ${base}/thursday
Feed (RSS): ${base}/feed.xml

## ${NEWSLETTER}, ${date}
${picks.map((p) => `- ${p.slot.label}: [${p.spot.name}](${base}/spot/${p.spot.id}) — ${p.spot.knownFor}`).join("\n")}
${localFavorites.length ? `\n## Highest rated by local members (3+ reviews)\n${localFavorites.map(([id, r]) => `- [${SPOT_BY_ID[id].name}](${base}/spot/${id}) — ${r.avg.toFixed(1)}/5 from ${r.count} reviews`).join("\n")}\n` : ""}
## Guides (best by cuisine and occasion)
${BEST_GUIDES.filter(publishable).map(link).join("\n")}

## Neighborhoods & towns
${PLACE_GUIDES.filter(publishable).map(link).join("\n")}

## Award-winning (Michelin Guide & James Beard)
${honored.map((s) => `- ${s.name} (${base}/spot/${s.id}): ${honorsOf(s.id).map((h) => `${h.label}${h.who ? ` — ${h.who}` : ""}, ${h.year}`).join("; ")}`).join("\n")}

## Best-loved places
${top.map((s) => `- [${s.name}](${base}/spot/${s.id}) — ${s.knownFor}`).join("\n")}
`;

  return new Response(text, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" },
  });
}
