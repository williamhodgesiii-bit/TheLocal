# The Local — Birmingham's independent food & drink map

Pick a craving, pick a part of town, and the map of Birmingham moves for you. Independent spots only: no fast food, no national chains.

- **Left 30%**: genre chips (Southern, BBQ, Italian, Seafood, Latin, Asian, Greek, Chef's Table, Brunch, Coffee, Sweets, **Drinks** with Cocktails / Breweries / Wine / Bars sub-filters), neighborhoods (Downtown, Southside & Five Points, Lakeview & Pepper Place, Avondale, Homewood, English Village, Mountain Brook Village, Crestline, Cahaba Heights), search, price and sort.
- **Right 70%**: a map you can't pan or zoom. The camera follows your choices. Pins and neighborhood names can still be clicked as shortcuts.
- **Spot page**: the storefront photo, then food photos, then member reviews. Members upload photos, tagged storefront, food or vibe. Also directions, save, share and nearby spots.
- **Surprise me**: a slot-machine pick, weighted toward popular local spots. It can stay inside your current filters. Press `S` anywhere to open it.
- Keyboard: `/` search · `↑/↓` browse · `Esc` back · `S` surprise.

## Deploy (Vercel)

1. Import the repo into Vercel (framework: Next.js). It deploys with **no environment variables**. Accounts, reviews and photos then run in on-device **demo mode**.
2. To make reviews and photos shared and persistent, create a Supabase project and run `supabase/schema.sql` in its SQL editor. Then add the following to Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - In Supabase → Auth, you can turn off "Confirm email" for instant sign-ups.
3. Optional: add `GOOGLE_PLACES_API_KEY` (Places API "New") for real storefront and food photos, the Google rating and the website link on every spot. Run `npm run geocode` once with the key to snap every pin to its exact location. This writes `lib/geo-overrides.json`.
4. Optional: set `NEXT_PUBLIC_SITE_URL` to your domain for the sitemap and OG tags.

See `.env.example`.

## Local dev

```bash
npm install
npm run dev
```

## Editing the guide

All spots live in `lib/data.ts`. Each spot has a name, genres, area, address, price, "known for", a blurb, tags and a popularity score. Birmingham's rotated street grid is encoded there, so grid addresses (`onAveN(2013, 2)` = 2013 2nd Ave N) place themselves on the map. Pins are approximate until you run `npm run geocode`. **Before launch, check every spot is still open and the details are right.**

Photos without a member or Google image fall back to two things. The storefront gets a procedurally drawn illustration, unique per spot. Food slots get representative Unsplash photography, labeled "Representative".

## Monetization built in

| Lever | Where |
| --- | --- |
| Partner tiers (Neighbor free / Regular $39 / Institution $99) | `/partners`. Leads go to `partner_leads` |
| Sponsored placement | set `sponsored: true` on a spot. It pins to the top of its lists with a visible **Sponsored** label and gets a modest Surprise Me boost |
| In-list "Your spot here" slot | the 5th position of any list with 7+ results |
| Claim-your-listing CTA | bottom of every spot page (pre-fills the partner form) |
| The Weekly Plate newsletter | the signup at the end of the list goes to `subscribers`. Sponsorship inventory |
| Partner analytics | Vercel Analytics events: `spot_view`, `directions`, `website`, `share`, `review`, `photo_upload`, `surprise_spin`. These are the numbers in partner reports |
| SEO | a static page per spot (`/spot/[id]`) with Restaurant JSON-LD, sitemap and OG image |

Trust rules (shown on `/partners`): paid placement is always labeled. Partners can't edit or remove reviews. Ratings come only from members.

## Stack

Next.js 14 (App Router) · React 18 · Leaflet (CARTO basemap; swap tiles via `NEXT_PUBLIC_MAP_TILES` for commercial scale) · Framer Motion · Supabase (optional) · self-hosted Fraunces, Big Shoulders Display, Instrument Sans and JetBrains Mono.
