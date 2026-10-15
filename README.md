# The Plate Next Door — Birmingham's locally owned food & drink map

**Skip the chains. Eat next door.** Pick what sounds good and where you're eating, and the map of Birmingham follows along. Locally owned places only: no fast food, no chains. *Neighbors feeding neighbors.*

**The brand**: the mark is a diner plate with a red band and a front door on it (`components/Brand.tsx`); the name, the line under it and the sign-off live in `lib/brand.ts`, so the voice is the same on every page, the share image and the app icon.

**The look**: the site is built to look like things you'd find around town, not a template. A restaurant's page is a green guest check with taped-up snapshots and reviews in handwriting. The map is a printed city map whose numbered pins match the list. Surprise Me prints a kitchen ticket. The header reads like a newspaper masthead with an AP-style dateline. Fonts: Yellowtail (sign script), Young Serif, Libre Franklin and Nanum Pen Script, all self-hosted.

- **The browse bar** (same on computers and phones), top to bottom: one search box; **what sounds good**, every kind of food on its own little plate (Southern, BBQ, Italian, Seafood, Latin, Asian, Greek, Special occasion, Brunch, Coffee, Sweets, and **Drinks** with cocktails, breweries, wine and bars); then three buttons that always show their current value: **Where** (a town, then a neighborhood; nobody is asked on the first visit), **Price**, and **Want to try**. Under it: how many places match, *Clear all*, and the sort.
- **The map**: drag it with the mouse or one finger, zoom with the wheel, a pinch, double-click, the +/− buttons or keys. The camera frames your picks; once you move it yourself, **Recenter** brings it back.
- **Front page** (until you narrow things down): **This week's plate** (one place for everyone, new every Thursday, the day the email goes out; `lib/collections.ts`), your **Plate Passport** card, three **occasion rows** picked for the time of day (Date night, Patio weather, Cheap & good, Brunch, Coffee to work from, Bring the kids, Big groups, Award winners, Breweries; built only from place tags, never padded), and a **trail**. "See all" turns a row into a filter that also reframes the map.
- **Plate Passport** (`lib/passport.ts`, the Passport tab): tap **I've been** on any place to stamp it, then say how it went (Loved it / It was good / Not for me). Shows how many of the listed places you've stamped, stamps by neighborhood, milestones (1, 5, 10, 25, 50, all), a forgiving weekly streak (a quiet week doesn't break it), trails (`lib/trails.ts`: a seasonal coffee trail, Over the mountain, Meat-and-threes) and a share card drawn in the browser (progress, not places). **Where have you eaten already?** lets people stamp the places they've been in one go, so nobody starts at zero. It works without an account and stays on the device.
- **Restaurant page**: name, the basics and what to order first, then awards (dated, each links to where it was announced; `lib/honors.ts`), Want to try / I've been, Directions & hours, photos, the write-up, reviews, nearby places, and who checked it and when, with **Report a change**.
- **Sort**: Most loved, **Nearest to me** (asks for your location only when you pick it), Top rated, A to Z. Nobody can pay to move up.
- **Surprise me**: a random pick, a little more likely for well-loved places, never for paid ones. If you've narrowed things down it starts inside your picks.
- **Trust**: a one-line promise under the headline (every place checked by a person, nobody pays to rank), and `/about` (**How we pick**): what counts as locally owned, how places get on, keeping it current, how we make money, and the review rules. Put your name and email in `FOUNDER` in `lib/brand.ts`; named people are one of the strongest trust signals a new site has.
- **Keyboard**: `/` search · `↑/↓` browse · `Esc` back · `S` surprise.

## Coverage today

The **Birmingham area**, by town: Birmingham (Downtown, Southside, Lakeview, Avondale), **Homewood** (downtown/SoHo, Edgewood, West Homewood), **Mountain Brook** (Mountain Brook Village and Lane Parke, English Village, Crestline) and **Vestavia Hills** (Cahaba Heights, Highway 31, Rocky Ridge).
- 83 locally owned places, including all 11 Birmingham places in Michelin's first American South guide (2025). They were checked against local news (Homewood Star, Village Living, Vestavia Voice, Bham Now) in October 2026. Known closures were left off: Satterfield's, Sol y Luna, Post Office Pies (both locations), DeVinci's and Iron City Pizza.
- **Exact pins, free**: a GitHub Action (`.github/workflows/pins.yml`) looks every place up on OpenStreetMap, which needs no key and no card. It saves the results to `lib/geo-overrides.json` and commits them, and Vercel redeploys. It runs by itself whenever `lib/data.ts` changes and on the 1st of every month, and keeps its own schedule switched on, so there is nothing to do by hand. A pin only moves if the match is within 3 km of where it was.
- **Optional Google key** (`GOOGLE_PLACES_API_KEY`, paid after Google's free allowance): adds Google photos and ratings, refines pins further, and drops places Google marks *permanently* closed (never closed-for-the-night or temporarily closed). See `/api/pins`.
- Other Alabama cities are already defined in `lib/regions.ts` with status `"later"`. To open one, change it to `"founding"` (members add places, staff verify) or `"live"`.

## Phones first

On a phone the site works like an app. A bottom tab bar has **Explore · Map · Surprise · Passport**.
- **Explore**: the front page (this week's plate, your passport, occasion rows you swipe, a trail), then the full list. The same browse bar; the plates swipe sideways, and the bar tucks away while you scroll down the list and comes back when you scroll up. Where and Price open as sheets from the bottom.
- **Map**: full screen, with swipeable place cards that steer the map.
- **Opening a place**: the place page sits under a strip of map with the pin on it.
- **Forms**: open as sheets from the bottom.
- **Home screen**: it can be added as an app (manifest and app icon included).
- **Passport** (`/me`): your Plate Passport (stamps, neighborhoods, trails, Been and Want to try lists, share card) for everyone; members also see their reviews, photos and the places they've added, and can edit their name and sign out.

## Real photos

Photos come from these sources, in this order:
1. Member uploads.
2. Openly licensed photos taken at the place itself (Johnny's, Good People), credited on the page. Add more in `PLACE_PHOTOS` in `lib/photos.ts`.
3. **Google Places photos** of the building and the food, once `GOOGLE_PLACES_API_KEY` is set. `npm run geocode` also saves each place's Google ID, so photo lookups are a single cheap call.
4. The drawn storefront, plus **stock photos of the dishes each place is known for**. About 50 photos were hand-picked from Wikimedia Commons, all licensed for commercial use (CC0, public domain, CC BY, CC BY-SA). Each place is mapped to its own dishes in `lib/photos.ts`: white sauce chicken at Saw's, shrimp and grits at Dyron's, a Cubano at Kool Korner. Member-added places fall back to their kind of food. Stock photos carry a yellow **stock** tag and credit their photographer. Every one is listed on `/credits`.

Images are served at sizes that fit the screen (`srcset`), load lazily, and fade in once decoded. On a phone the food photos are a strip you swipe sideways. The viewer shows each photo whole, not cropped, and you can swipe between them.

Photos copied off restaurants' websites or Instagram aren't used. They're copyrighted.

## Community spots & verification

- **Add a spot**: any signed-in member can submit a place they've been to, from the top bar, the "Know a spot we're missing?" card, or a founding city's banner. The form asks for name, genres, price, address and a pin, neighborhood, "known for", a description, optional website, phone and storefront photo, and two confirmations (*I've been here* and *it's independent*).
- **Guardrails before submit**: names that match a national chain or fast-food list are flagged (`lib/chains.ts`). Spots already on the map are flagged as duplicates by name and distance. "Find it" looks up the address (Google Places with a key, otherwise OpenStreetMap). A member can have at most 10 submissions pending at once.
- **Verification desk** (`/admin`): staff see each submission next to an editable pin map, plus lookup tools: the Google listing status (*operational* or *closed permanently*), search, maps, the website and a tap-to-call link. Staff can fix any field. **Certify & publish** stays locked until four checks are ticked: it exists and is open, the location is correct, it's independent, and the content is appropriate. Staff can also decline with a reason.
- **After approval**: the spot goes live on its city map with "Added by {member} · verified by The Plate Next Door". The member's storefront photo becomes the building photo. The member gets a notice next visit and can track every status on their page.
- **Staff in production**: run this after the member signs up:
  `insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';`

## Cities, home and "Where are you?"

`lib/regions.ts` defines states and cities. Each city has a status:
- **live**: Birmingham, the launch city with the curated guide.
- **founding**: open for members to add places, each checked before it shows. Neighborhoods appear from the places that get approved. None yet.
- **later**: coming soon. Huntsville, Montgomery, Mobile, Tuscaloosa, Auburn–Opelika, the Shoals, Decatur, Gadsden, Dothan, the Eastern Shore, the Gulf Coast and Atlanta. They're listed under "Coming soon" with a way to get one email when they open (the `waitlist` table), so you can see where demand is before you expand.

**Home.** Joining asks for a name, an email (plus a password to sign back in) and **Where's home?** Home can be a city on the map, one that's coming, or a town we don't have yet. The map opens on home every visit, on any device the member signs in on. It's saved on the account (`home_city`) and on the device. Members change it on their page; visitors without an account can tap "Make … home" in the city picker. A home we don't cover yet goes on the waitlist, and the site shows Birmingham until it opens.

**Where are you?** The bar at the top of the list. Pick a city to see its food and reviews, or tap **Use my location**. It doesn't change home: it lasts until the tab closes, and the bar offers "Back to {home}". Coming-soon cities offer the email-me form instead.

Each open city has its own page (`/al/huntsville`) and every place has its own page (`/spot/{id}`). Both are in the sitemap. To open a city, change its status in `CITIES` to `"founding"` or `"live"`; to add one, add a line.

## To do

Not built yet, in rough order:

- [ ] **Open now.** Needs hours for every place. The free route is to pull OpenStreetMap's `opening_hours` in the pins Action (Google's hours when `GOOGLE_PLACES_API_KEY` is set), then show "Open now" or "Closes at 9" on cards and the place page, plus an "Open now" filter. Show the date the hours were checked, since they change.
- [ ] **The Thursday Plate, the weekly email.** Signups already collect in the `subscribers` table. Still needed: a sending service (Buttondown, Resend or Mailchimp), a weekly email built from `plateOfTheWeek` (it already turns over every Thursday) plus new places and trails, and a note when a place on someone's want-to-try list is the pick. Every email needs an unsubscribe link and a mailing address (CAN-SPAM).
- [ ] **Founder name and email.** Fill in `FOUNDER` in `lib/brand.ts`. The "Who we are" part of `/about` shows up once a name is set. A named person you can write to is one of the strongest trust signals in the research.
- [ ] **Michelin American South 2026** comes out Oct 21, 2026. Update `lib/honors.ts` (new badges, changed or dropped ones) and the Award winners row follows. Add any newly recognized local places to `lib/data.ts`.
- [ ] **Re-check the list** every few months: closures, new owners, prices. Bump `CHECKED` in `lib/brand.ts` when done.
- [ ] **Owner setup:** Supabase (see Deploy), the domain and `NEXT_PUBLIC_SITE_URL`, privacy and terms pages (before collecting emails), payments for Partner and Sponsored (Stripe payment links are the simplest start), and turning on Vercel Analytics.
- [ ] **Have a lawyer read** the review rules and the Sponsored labeling on `/about` and `/partners`.
- [ ] **Real photos of every place** (owner uploads or a local photographer) to replace the labeled stock dish photos.
- [ ] **Passport across devices** for signed-in members. Today it stays on the device.
- [ ] **Sign in by email link** instead of a password, once an email service is set up (Supabase's built-in email is for testing only). Joining would then be just name, email and home.

## Deploy (Vercel)

1. Import the repo into Vercel (framework: Next.js). It deploys with **no environment variables**. Accounts, reviews and photos then run in on-device **demo mode**.
2. To make reviews and photos shared and persistent, create a Supabase project and run `supabase/schema.sql` in its SQL editor. Then add the following to Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - In Supabase → Auth, you can turn off "Confirm email" for instant sign-ups.
3. Optional: add `GOOGLE_PLACES_API_KEY` (Places API "New") for real storefront and food photos, the Google rating and the website link on every spot. Pins snap to their exact locations automatically once the key is set (see `/api/pins`).
4. Optional: set `NEXT_PUBLIC_SITE_URL` to your domain for the sitemap and OG tags.

See `.env.example`.

## Local dev

```bash
npm install
npm run dev
```

## Editing the guide

All spots live in `lib/data.ts`. Each spot has a name, genres, area, address, price, "known for", a blurb, tags and a popularity score. Birmingham's rotated street grid is encoded there, so grid addresses (`onAveN(2013, 2)` = 2013 2nd Ave N) place themselves on the map. Pins start as estimates and are replaced by OpenStreetMap lookups (see the Map pins Action). **Before launch, check every spot is still open and the details are right.**

Photos without a member or Google image fall back to two things. The storefront gets a procedurally drawn illustration, unique per spot. Food slots get labeled stock photos of that place's dishes (`lib/photos.ts`).

## Monetization built in

| Lever | Where |
| --- | --- |
| Listing (free) / Partner $39 a month / Sponsored spot $99 a month | `/partners`. Leads go to `partner_leads`. Partner is presentation and a monthly report; it never changes order |
| Sponsored spot | set `sponsored: true` on a spot. It shows as one card labeled **Sponsored**, apart from the list, once someone has picked a kind of food or part of town. At most one per kind of food and one per neighborhood (keep it that way when you sell it). Never in rankings, awards or Surprise me |
| "Presented by" | a sponsor line on The Thursday Plate email or a seasonal trail (banks, credit unions, local services) |
| In-list "Own a place like these?" card | the 5th position of any list with 7+ results |
| Claim-your-listing CTA | bottom of every spot page (pre-fills the partner form) |
| The Thursday Plate email | the signup at the end of the list goes to `subscribers`. Sponsorship inventory |
| Partner analytics | Vercel Analytics events: `spot_view`, `directions`, `website`, `share`, `review`, `photo_upload`, `surprise_spin`. These are the numbers in partner reports |
| SEO | a static page per spot (`/spot/[id]`) with Restaurant JSON-LD, sitemap and OG image |

Trust rules (on `/partners` and `/about`): nobody pays to rank; anything paid says **Sponsored** right next to it; owners can't buy, edit or remove reviews; reviews come only from members and show their date. The research behind this (FTC review rules, what sank Yelp's trust, what local media charge) is in the redesign research report.

## Stack

Next.js 14 (App Router) · React 18 · MapLibre GL with OpenFreeMap vector tiles, drawn in the site's own style (`lib/map-style-print.ts`; Leaflet and plain OpenStreetMap tiles when WebGL is off or the tiles are down) · Framer Motion · Supabase (optional) · self-hosted Yellowtail, Young Serif, Libre Franklin and Nanum Pen Script.
