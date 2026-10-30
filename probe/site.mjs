// Read-only: what the live site says about itself right now.
const SITE = "https://www.theplatenextdoor.com";
for (let i = 0; i < 12; i++) {
  const h = await fetch(`${SITE}/api/health`).then((r) => r.json()).catch(() => ({}));
  if (h.thursdayLetter) { console.log("health", JSON.stringify(h)); break; }
  console.log("old deploy still live, waiting"); await new Promise((r) => setTimeout(r, 30000));
}
const v = await fetch(`${SITE}/api/letter`);
const html = await v.text();
console.log("letter view", v.status, ["Fine dining", "Casual", "Wildcard"].every((x) => html.includes(x)) ? "has all three slots" : "missing slots", (html.match(/<h2[^>]*><a[^>]*>([^<]+)</g) || []).map((m) => m.replace(/.*>/, "")).join(" | "));
const c = await fetch(`${SITE}/api/letter/cron`).then(async (r) => `${r.status} ${await r.text()}`);
console.log("cron", c);
