// Submit every URL in the live sitemap to IndexNow (Bing, Yandex, and partners),
// which indexes near-instantly. Google ignores IndexNow — it's covered by the
// sitemap + Search Console — so this is the automated half of "index everywhere".
//
// Usage:  SITE_URL=https://theplatenextdoor.com INDEXNOW_KEY=<key> node scripts/indexnow.mjs
// Defaults are baked in so it also works with no env set.

import { readdirSync } from "node:fs";

const SITE_URL = (process.env.SITE_URL || "https://www.theplatenextdoor.com").replace(/\/$/, "");
const HOST = new URL(SITE_URL).host;

// The key is public (it's served at /<key>.txt). Prefer env, else find the key file in public/.
function resolveKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY;
  try {
    const f = readdirSync("public").find((n) => /^[a-f0-9]{8,128}\.txt$/i.test(n));
    if (f) return f.replace(/\.txt$/i, "");
  } catch {}
  return null;
}

async function main() {
  const key = resolveKey();
  if (!key) {
    console.error("No IndexNow key found (set INDEXNOW_KEY or add public/<key>.txt). Skipping.");
    process.exit(0);
  }

  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  let xml;
  try {
    const res = await fetch(sitemapUrl, { headers: { "user-agent": "theplatenextdoor-indexnow/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch (e) {
    console.error(`Could not fetch ${sitemapUrl}: ${e.message}`);
    process.exit(1);
  }

  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim())
    .filter((u) => u.startsWith(SITE_URL));

  if (!urlList.length) {
    console.error("No URLs parsed from the sitemap. Skipping.");
    process.exit(0);
  }

  const body = {
    host: HOST,
    key,
    keyLocation: `${SITE_URL}/${key}.txt`,
    urlList: urlList.slice(0, 10000),
  };

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    console.log(`IndexNow: submitted ${body.urlList.length} URLs for ${HOST} → HTTP ${res.status}`);
    // 200 = accepted, 202 = accepted/validation pending. Both fine.
  } catch (e) {
    console.error(`IndexNow request failed: ${e.message}`);
    process.exit(0); // a transient ping failure shouldn't fail the whole run
  }
}

main();
