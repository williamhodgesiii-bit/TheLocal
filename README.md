# The Local — Birmingham's independent food & drink map

Pick what sounds good and what part of town, and the map of Birmingham follows along. Locally owned places only: no fast food, no chains.

**The look**: the site is built to look like things you'd find around town, not a template. The left side is a diner menu with dotted leaders, and your choices get circled in ballpoint pen. A restaurant's page is a green guest check with taped-up snapshots and reviews in handwriting. The map is a printed city map whose numbered pins match the menu. Surprise Me prints a kitchen ticket. The header reads like a newspaper masthead with an AP-style dateline. Fonts: Yellowtail (sign script), Young Serif, Libre Franklin and Nanum Pen Script, all self-hosted.

- **Left 30%**: kinds of food (Southern, BBQ, Italian, Seafood, Latin, Asian, Greek, Special occasion, Brunch, Coffee, Sweets, and **Drinks** with cocktails, breweries, wine and bars), neighborhoods (Downtown, Southside & Five Points, Lakeview & Pepper Place, Avondale, Homewood, English Village, Mountain Brook Village, Crestline, Cahaba Heights), search, price and sort.
- **Right 70%**: a map you can't pan or zoom. The camera follows your choices. Pins and neighborhood names can still be clicked.
- **Restaurant page**: building photo first, then food photos, then member reviews. Members can upload photos. Also directions, save, share and nearby places.
- **Surprise me**: picks a place, weighted toward the well-loved ones. It can stay inside your current picks.
- **Keyboard**: `/` search · `↑/↓` browse · `Esc` back · `S` surprise.

## Community spots & verification

- **Add a spot**: any signed-in member can submit a place they've been to, from the top bar, the "Know a spot we're missing?" card, or a founding city's banner. The form asks for name, genres, price, address and a pin, neighborhood, "known for", a description, optional website, phone and storefront photo, and two confirmations (*I've been here* and *it's independent*).
- **Guardrails before submit**: names that match a national chain or fast-food list are flagged (`lib/chains.ts`). Spots already on the map are flagged as duplicates by name and distance. "Find it" looks up the address (Google Places with a key, otherwise OpenStreetMap). A member can have at most 10 submissions pending at once.
- **Verification desk** (`/admin`): staff see each submission next to an editable pin map, plus lookup tools: the Google listing status (*operational* or *closed permanently*), search, maps, the website and a tap-to-call link. Staff can fix any field. **Certify & publish** stays locked until four checks are ticked: it exists and is open, the location is correct, it's independent, and the content is appropriate. Staff can also decline with a reason.
- **After approval**: the spot goes live on its city map with "Added by {member} · verified by The Local". The member's storefront photo becomes the building photo. The member gets a notice next visit and can track every status under **Your spots**, with *Verified contributor* and *Founding Local* badges.
- **Staff in production**: run this after the member signs up:
  `insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';`

## Cities & states

`lib/regions.ts` defines states and cities.
- **Birmingham** is the *live* launch city with the curated guide.
- Other Alabama cities (Huntsville, Montgomery, Mobile, Tuscaloosa, Auburn–Opelika, the Shoals, Decatur, Gadsden, Dothan, the Eastern Shore and the Gulf Coast) are **founding cities**. Members add spots there, and neighborhoods appear automatically from the spots that get approved.
- Every other state shows a **waitlist** (the `waitlist` table) so you can see where demand is before you expand.

On first visit, people pick a home state and city, and the choice is remembered. Each city has its own page (`/al/huntsville`) and every spot has its own page (`/spot/{id}`). Both are in the sitemap. To open a new city or state, add a line to `CITIES`.

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
