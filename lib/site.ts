// The one canonical host, used for every canonical tag, the sitemap, OpenGraph
// and structured data. It must match the host the site actually serves on so a
// canonical never points at a redirect. The apex (theplatenextdoor.com)
// redirects to www, so www is the canonical host in production.
// Override anytime by setting NEXT_PUBLIC_SITE_URL.
export const CANONICAL_HOST = "https://www.theplatenextdoor.com";

export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return CANONICAL_HOST;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
