/**
 * Structured data (schema.org JSON-LD) builders, in one place.
 *
 * Why it matters: rich, honest structured data is what earns Google's rich
 * results (stars, map, price, hours) AND what the AI answer engines (ChatGPT,
 * Perplexity, Google AI Overviews) read when they decide whose restaurants to
 * name. Everything here is built from the real place data — never padded, never
 * a rating we don't have.
 */
import { BRAND, MANTRA, FOUNDER } from "./brand";
import { siteUrl } from "./site";
import { AREA_BY_ID, GENRE_BY_ID, TOWN_BY_ID, type Spot } from "./data";
import { CITY_BY_ID } from "./regions";
import { honorsOf } from "./honors";
import { coverFor, commonsSrc } from "./photos";

/** an absolute URL for a site-relative path */
export const abs = (path: string) => `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;

const ORG_ID = () => `${siteUrl()}/#organization`;
const SITE_ID = () => `${siteUrl()}/#website`;

const DESCRIPTION = `${MANTRA} A hand-checked guide to locally owned restaurants, coffee shops and bars in Birmingham, Homewood, Mountain Brook and Vestavia Hills, Alabama. No chains, nobody pays to rank.`;

/** A large, absolute cover-image URL for a spot (for OpenGraph + structured data). */
export function spotImage(s: Spot, width = 1200): string | undefined {
  try {
    const c = coverFor(s);
    return c?.file ? commonsSrc(c.file, width) : undefined;
  } catch {
    return undefined;
  }
}

/** The town a spot sits in (Birmingham, Homewood, Mountain Brook, Vestavia Hills). */
export function localityOf(s: Spot): string {
  const town = AREA_BY_ID[s.area]?.town;
  if (town && TOWN_BY_ID[town]) return TOWN_BY_ID[town].label;
  return CITY_BY_ID[s.city]?.name ?? "Birmingham";
}

/** schema.org type that best fits a spot. */
export function spotType(s: Spot): string {
  const only = (g: string) => s.genres.length === 1 && s.genres[0] === g;
  if (s.drinks?.includes("brewery")) return "BarOrPub";
  if (only("drinks")) return "BarOrPub";
  if (only("coffee")) return "CafeOrCoffeeShop";
  if (only("sweets")) return "Bakery";
  return "Restaurant";
}

/** The site publisher, shared across every page via an @id reference. */
export function organizationLd() {
  const founders = FOUNDER.name
    ? FOUNDER.name.split(/\s*[&,]\s*/).filter(Boolean).map((name) => ({ "@type": "Person", name }))
    : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID(),
    name: BRAND,
    url: siteUrl(),
    logo: abs("/icon-512.png"),
    image: abs("/opengraph-image.png"),
    slogan: MANTRA,
    description: DESCRIPTION,
    ...(FOUNDER.email ? { email: FOUNDER.email } : {}),
    ...(founders ? { founder: founders } : {}),
    areaServed: ["Birmingham", "Homewood", "Mountain Brook", "Vestavia Hills"].map((name) => ({
      "@type": "City",
      name,
      containedInPlace: { "@type": "State", name: "Alabama" },
    })),
    knowsAbout: ["Birmingham restaurants", "Alabama food", "locally owned restaurants", "Southern food", "barbecue", "Michelin Guide Birmingham"],
  };
}

/** The website entity, so engines tie every page to one site. */
export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID(),
    url: siteUrl(),
    name: BRAND,
    description: DESCRIPTION,
    inLanguage: "en-US",
    publisher: { "@id": ORG_ID() },
  };
}

/** Breadcrumbs — helps Google render the path and helps AI place the page. */
export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

/** One restaurant/bar/café, as rich as the data honestly allows. */
export function spotLd(s: Spot) {
  const city = CITY_BY_ID[s.city];
  const honors = honorsOf(s.id);
  const img = spotImage(s);
  return {
    "@context": "https://schema.org",
    "@type": spotType(s),
    "@id": `${abs(`/spot/${s.id}`)}#business`,
    name: s.name,
    url: abs(`/spot/${s.id}`),
    description: `${s.knownFor}. ${s.blurb}`,
    priceRange: "$".repeat(s.price),
    servesCuisine: s.genres.map((g) => GENRE_BY_ID[g]?.label).filter(Boolean),
    ...(img ? { image: [img] } : {}),
    ...(s.phone ? { telephone: s.phone } : {}),
    ...(s.website ? { sameAs: [s.website] } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: s.address,
      addressLocality: localityOf(s),
      addressRegion: city?.state ?? "AL",
      addressCountry: "US",
    },
    geo: { "@type": "GeoCoordinates", latitude: s.coords[0], longitude: s.coords[1] },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${s.coords[0]},${s.coords[1]}`,
    ...(honors.length
      ? { award: honors.map((h) => `${h.label}${h.who ? ` — ${h.who}` : ""} (${h.year})`) }
      : {}),
    isPartOf: { "@id": SITE_ID() },
    publisher: { "@id": ORG_ID() },
  };
}

/**
 * An ordered list of spots as a summary-page ItemList (position + link + name).
 * This is Google's recommended shape for a "best of" page that links out to the
 * individual detail pages, and it's what AI engines read to pull a ranked list.
 */
export function itemListLd(spots: Spot[], opts: { name: string; description?: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    url: abs(opts.path),
    numberOfItems: spots.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: spots.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: abs(`/spot/${s.id}`),
      name: s.name,
    })),
  };
}

/** A simple FAQ block. (Not for rich snippets anymore, but clean, quotable Q&A for AI engines.) */
export function faqLd(qa: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/** A collection/guide page wrapper tying the list to the site graph. */
export function collectionPageLd(opts: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: abs(opts.path),
    isPartOf: { "@id": SITE_ID() },
    about: { "@id": ORG_ID() },
  };
}
