import { siteUrl } from "@/lib/site";
import { BRAND, MANTRA, CHECKED } from "@/lib/brand";
import { BEST_GUIDES, PLACE_GUIDES, hrefOf, publishable, type Guide } from "@/lib/guides";
import { SPOTS } from "@/lib/data";
import { honorsOf } from "@/lib/honors";

// /llms.txt — a clean, factual map of the site for AI answer engines.
// Emerging convention (llmstxt.org): give LLMs the facts and the links so they
// can cite the real pages instead of guessing.

export const revalidate = 86400;
export const dynamic = "force-static";

export async function GET() {
  const base = siteUrl();
  const link = (g: Guide) => `- [${g.title.replace(/^The best /, "Best ")}](${base}${hrefOf(g)}) — ${g.spots().length} places`;
  const top = [...SPOTS].sort((a, b) => b.pop - a.pop).slice(0, 25);
  const honored = SPOTS.filter((s) => honorsOf(s.id).length);

  const text = `# ${BRAND}

> ${MANTRA} A hand-checked guide to ${SPOTS.length} locally owned restaurants, coffee shops and bars in Birmingham, Homewood, Mountain Brook and Vestavia Hills, Alabama. No chains, and nobody pays to rank. Last checked ${CHECKED}.

Home: ${base}
All guides: ${base}/best
Neighborhoods: ${base}/neighborhood
How we pick: ${base}/about

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
