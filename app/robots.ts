import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Everything public is open to search engines and AI answer engines (Google, Bing, which ChatGPT
 * search reads, Perplexity, Claude, Apple). Private and members-only screens, short flyer links
 * and tracking redirects stay out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/api/", "/admin", "/auth/", "/me", "/go/", "/friends", "/u/", "/lists", "/people", "/140", "/pick"];
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/api/cover"], disallow },
      // link previews: when someone shares a profile or a place in a text or a post, these fetch
      // the page's title and share card (they don't index anything)
      {
        userAgent: ["Twitterbot", "facebookexternalhit", "LinkedInBot", "Slackbot-LinkExpanding", "Discordbot", "WhatsApp", "TelegramBot"],
        allow: ["/", "/u/"],
        disallow: ["/api/", "/admin", "/auth/", "/go/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
