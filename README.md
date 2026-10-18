# The Plate Next Door — Birmingham's locally owned food & drink map

**Skip the chains. Eat next door.** Pick what sounds good and where you're eating, and the map of Birmingham follows along. Locally owned places only: no fast food, no chains. *Neighbors feeding neighbors.*

**The brand**: the mark is a diner plate with a red band and a front door on it (`components/Brand.tsx`); the name, the line under it and the sign-off live in `lib/brand.ts`, so the voice is the same on every page, the share image and the app icon.

**The look**: the site is built to look like things you'd find around town, not a template. A restaurant's page is a green guest check with taped-up snapshots and reviews in handwriting. The map is a printed city map whose numbered pins match the list. Surprise Me prints a kitchen ticket. The header reads like a newspaper masthead with an AP-style dateline. Fonts: Yellowtail (sign script), Young Serif, Libre Franklin and Nanum Pen Script, all self-hosted.

- **The browse bar** (same on computers and phones), top to bottom: one search box; **what sounds good**, every kind of food on its own little plate (Southern, BBQ, Burgers & Sandwiches, Pizza, Italian, Seafood, Steaks & Live Fire, Latin, Asian, Greek, French, Brunch, Sweets & Bakeries, Coffee, and **Bars** with cocktails, pubs & dives, wine bars and breweries). Plates are kinds of food only; occasions like Date night and Special occasion are rows on the front page; then three buttons that always show their current value: **Where** (a town, then a neighborhood; nobody is asked on the first visit), **Price**, and **Want to try**. Under it: how many places match, *Clear all*, and the sort.
- **The map**: drag it with the mouse or one finger, zoom with the wheel, a pinch, double-click, the +/− buttons or keys. The camera frames your picks; once you move it yourself, **Recenter** brings it back.
- **Names on the pins**: zoom in to neighborhood level and each pin's name prints beside it, wherever there's room. The top of your list claims room first; a name tries the right, left, below and above, never covers another pin, name, the caption or the buttons, and is worked out again every frame as you zoom, so names make way and come back. Tap a name to open the place. (`placeNames` in `components/map-shared.tsx`.)
- **Front page** (until you narrow things down): **This week's plate** (one place for everyone, new every Thursday, the day the email goes out; `lib/collections.ts`), your **Plate Passport** card, three **occasion rows** picked for the time of day (Date night, Patio weather, Cheap & good, Brunch, Coffee to work from, Bring the kids, Big groups, Award winners, Breweries; built only from place tags, never padded), and a **trail**. "See all" turns a row into a filter that also reframes the map.
- **Plate Passport** (`lib/passport.ts`, the Passport tab): tap **I've been** on any place to stamp it, then say how it went (Loved it / It was good / Not for me). Shows how many of the listed places you've stamped, stamps by neighborhood, milestones (1, 5, 10, 25, 50, all), a forgiving weekly streak (a quiet week doesn't break it), trails (`lib/trails.ts`: a seasonal coffee trail, Over the mountain, Meat-and-threes) and a share card drawn in the browser (progress, not places). **Where have you eaten already?** lets people stamp the places they've been in one go, so nobody starts at zero. It's for members (signing in takes seconds, no password) and follows them to every device.
- **Restaurant page**: name, the basics and what to order first, then awards (dated, each links to where it was announced; `lib/honors.ts`), Want to try / I've been, Directions & hours, photos, the write-up, reviews, nearby places, and who checked it and when, with **Report a change**.
- **Sort**: Most loved, **Nearest to me** (asks for your location only when you pick it), Top rated, A to Z. Nobody can pay to move up.
- **Surprise me**: a random pick, a little more likely for well-loved places, never for paid ones. If you've narrowed things down it starts inside your picks.
- **Trust**: a one-line promise under the headline (every place checked by a person, nobody pays to rank), and `/about` (**How we pick**): what counts as locally owned, how places get on, keeping it current, how we make money, and the review rules. Put your name and email in `FOUNDER` in `lib/brand.ts`; named people are one of the strongest trust signals a new site has.
- **Keyboard**: `/` search · `↑/↓` browse · `Esc` back · `S` surprise.

## Coverage today

The **Birmingham area**, by town: Birmingham (Downtown, Southside, Lakeview, Avondale & Forest Park), **Homewood** (downtown/SoHo, Edgewood, West Homewood), **Mountain Brook** (Mountain Brook Village and Lane Parke, English Village, Crestline), **Vestavia Hills** (Cahaba Heights, Highway 31, Rocky Ridge, Liberty Park), **Hoover** (Patton Chapel), and **Worth the drive** (Irondale, Dickey Springs, Alabaster) for the few places further out that people drive for.
- 138 places, including all 11 Birmingham places in Michelin's first American South guide (2025), and the city's bars: cocktail bars, dives, sports bars, wine bars and breweries. Checked against local news (Bham Now, Homewood Star, Village Living, Vestavia Voice, Over the Mountain Journal) in October 2026. Known closures were left off: Satterfield's, Sol y Luna, Post Office Pies, DeVinci's, Iron City Pizza, Revelator Coffee (all), Hero Doughnuts (now Full Circle), Rodney Scott's, Joyland, Marty's PM, Ghost Train Brewing, Nabeel's, Ocean, Tasty Town, Queen's Park and Nana Funks.
- **One listing per place.** A local place with more than one location (Big Spoon, Brick & Tin, Cala Coffee, El Barrio, Jim 'N Nick's, Paramount, Taco Mama) is one listing with every location on it (`also` in `lib/data.ts`). It counts in each neighborhood it's in, and its pin moves to the location in the part of town you pick, or the nearest one when sorting by distance. Old per-location links redirect (`SPOT_ALIASES`), and saves and stamps carry over. Saw's BBQ and Saw's Soul Kitchen stay separate: different restaurants, same family.
- **Off for now** (Oct 2026): DG, Green Acres, Eagle's and Fife's.
- **Chains**: locally owned places, plus names born in the Birmingham area even when they've grown or franchise (Saw's, Taco Mama, Jim 'N Nick's, Golden Rule, Dreamland, which is run from Birmingham). Chains that started somewhere else stay off even when a local franchisee runs the store here (Moe's Original BBQ, Martin's, Jack Brown's, Mellow Mushroom, Momma Goldberg's, New York Butcher Shoppe, Original Pancake House, Wooden City, Lapeer, Epice), and so do drive-thru-only shops. `lib/chains.ts` flags those names on member submissions.
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
0. **A cover the restaurant supplied** (Galley & Garden). It leads the place page and its cards, credited and linked to the restaurant, and is listed on `/credits`. Put the file in `public/photos/` (a full size and a 600px one) and add it to `HOUSE_PHOTOS` in `lib/photos.ts`.
1. Member uploads.
2. Openly licensed photos taken at the place itself (Johnny's, Good People), credited on the page. Add more in `PLACE_PHOTOS` in `lib/photos.ts`.
3. **Google Places photos** of the building and the food, once `GOOGLE_PLACES_API_KEY` is set. `npm run geocode` also saves each place's Google ID, so photo lookups are a single cheap call.
4. The drawn storefront, plus **stock photos of the dishes each place is known for**. About 50 photos were hand-picked from Wikimedia Commons, all licensed for commercial use (CC0, public domain, CC BY, CC BY-SA). Each place is mapped to its own dishes in `lib/photos.ts`: white sauce chicken at Saw's, shrimp and grits at Dyron's, a Cubano at Kool Korner. Member-added places fall back to their kind of food. Stock photos carry a yellow **stock** tag and credit their photographer. Every one is listed on `/credits`.

Images are served at sizes that fit the screen (`srcset`), load lazily, and fade in once decoded. On a phone the food photos are a strip you swipe sideways. The viewer shows each photo whole, not cropped, and you can swipe between them.

Photos copied off restaurants' websites or Instagram aren't used unless the restaurant says yes. They're copyrighted. A restaurant's cover goes in only with its OK.

## Community spots & verification

- **Add a spot**: any signed-in member can submit a place they've been to, from the top bar, the "Know a spot we're missing?" card, or a founding city's banner. The form asks for name, genres, price, address and a pin, neighborhood, "known for", a description, optional website, phone and storefront photo, and two confirmations (*I've been here* and *it's independent*).
- **Guardrails before submit**: names that match a national chain or fast-food list are flagged (`lib/chains.ts`). Spots already on the map are flagged as duplicates by name and distance. No map to fiddle with: the address is looked up as soon as you leave the box (Google Places with a key; otherwise, free, the US Census geocoder, which knows suburban house numbers, then OpenStreetMap), tidied, and the neighborhood is filled in from the nearest place already listed. A map to place it by hand appears only if the address can't be found. A member can have at most 10 submissions pending at once.
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
- [ ] **The rest of the owner's list (Oct 2026).** Still to confirm open in 2026 before adding: Café Dupont, Blueprint on 3rd, Bocca, Makarios, Falafel Café, Bay Leaf, EastWest, Shu Shop, Mr. Shawarma, June Coffee, General, Uncle G's (Hop City), The Standard (Pizitz), Porch, Hello Bakery, Whiskey Foxtrot (Homewood), Hamburger Heaven (Homewood), Mr. Chen's (Homewood), Oak Hill Bar & Grill, Mexico Lindo, Mr. P's Deli and Creekside BBQ. Still to check who owns or where they started: Otoro Hibachi, Waldo's Chicken & Beer, Baumhower's, Overtime Grill. Henrietta's Deli needs its new Trussville address.
- [ ] **Re-check the list** every few months: closures, new owners, prices. Bump `CHECKED` in `lib/brand.ts` when done.
- [ ] **Owner setup:** Supabase, Google sign-in and Google Analytics (see **Accounts, database & analytics**), a terms page, payments for Partner and Sponsored (Stripe payment links are the simplest start), and turning on Vercel Analytics.
- [ ] **Have a lawyer read** the review rules and the Sponsored labeling on `/about` and `/partners`.
- [ ] **Real photos of every place** (owner uploads or a local photographer) to replace the labeled stock dish photos.
- [x] **Passport across devices**: kept in the account (`stamps`, `saved_spots`).
- [x] **Passwordless sign-in**: one flow for new and returning members (Google one-tap, email code or link, passkeys), guest lists carried into the account. Needs the setup below.

## Deploy (Vercel)

1. Import the repo into Vercel (framework: Next.js). It deploys with **no environment variables**. Accounts, reviews and photos then run in on-device **demo mode**.
2. For real accounts and a shared database, follow **Accounts, database & analytics** below.
3. Optional: add `GOOGLE_PLACES_API_KEY` (Places API "New") for real storefront and food photos, the Google rating and the website link on every spot. Pins snap to their exact locations automatically once the key is set (see `/api/pins`).
4. Optional: set `NEXT_PUBLIC_SITE_URL` to your domain for the sitemap and OG tags.

See `.env.example`.

## Accounts, database & analytics

**How sign-in works (and why).** Exploring is open to everyone, with no account: every place, the map, the guides and the front page. Anything personal needs one, so signing in is made as quick as it can be:

- **Explore free, sign in to make it yours.** Stamping the Plate Passport, the want-to-try list, Surprise me, reviews, photos and adding places ask a guest to sign in first, and the thing they tapped happens the moment they're in (after their lists load, so nothing is overwritten). Lists a guest kept on a device from before this move into their account at sign-in; nothing is lost.
- **One flow, no fork.** No "sign in" vs "sign up" choice and no password. Type an email (or tap Google) and you're in, new or returning — the same idea as [Uber's unified login](https://www.uber.com/blog/usl-ubers-unified-signup-and-login-stack/).
- **Code or link, either works.** The email carries a 6-digit code (keeps you in the app on a phone) and a link (one tap on a laptop). The code box autofills from the email/SMS on iOS and Android, auto-submits on the last digit, and has a resend timer.
- **Google one-tap** and **passkeys** (Face ID, fingerprint, device PIN; offered right after joining and from your page).
- **One question, after.** New members are asked only "What should we call you?", prefilled. Home city is picked by using the map, never at sign-up.
- **Back where you were.** Signing in to write a review, add a photo or add a place drops you straight back into it.
- **A gentle first-visit nudge, never a wall.** A small card to the side (not a pop-up over the content, which Google [penalises on mobile](https://developers.google.com/search/docs/essentials/spam-policies#pop-ups) and which buries what people came for) appears a few seconds in, offering Google or email. Dismiss it and it waits 3 days, then 2 weeks, then stops after three asks; signing in anywhere ends it for good. It shows only when signed-out and only on the map/passport pages, and its wording tells the truth for the mode it's in ("every device" only with Supabase behind it). See `components/SignInNudge.tsx`.
- **In the database:** members (`profiles`, kept in step automatically), `saved_spots`, `stamps`, reviews, photos, submissions, spots, newsletter, waitlist and partner leads, all with row-level security. Members can delete their account (and everything in it) from their page.

### What it costs: $0

Every piece of sign-in runs on a free plan. No credit card is needed for any of them.

| Service | Free plan | What happens at the limit | How we stay under it |
| --- | --- | --- | --- |
| [Supabase](https://supabase.com/pricing) (database, sign-in, photo storage) | 50,000 monthly members, 500 MB database, 1 GB photos, 5 GB bandwidth, custom email server included | Pauses after a week with no activity | `.github/workflows/keepalive.yml` pings `/api/health` every 3 days, so it never goes idle. Photos are shrunk before upload. |
| [Resend](https://resend.com/pricing) (sends the sign-in emails) | 3,000 emails a month, 100 a day, SMTP included | Sending pauses for the rest of the day | Google sign-in and passkeys send no email, and members stay signed in, so codes are only for new devices. If the cap is ever hit, the sign-in box says so and points to Google. |
| Google sign-in (Google Cloud OAuth) | Free, no billing account needed | — | — |
| Google Analytics 4 | Free | — | — |
| Passkeys | Free (Supabase beta, switch it on) | — | — |
| GitHub Actions (IndexNow pings, keepalive) | Free for public repos; 2,000 minutes a month for private | — | A few minutes a month |

Don't add a paid plan or a card anywhere in the steps below; none of them need one.

### Setup (one time, about 20 minutes)

**Easiest: one tap, nothing to paste.** Supabase's editors don't take a paste on a phone, so `Set up Supabase` (in GitHub Actions) does the database, the sign-in settings, the free email sender and the sign-in email for you, and is safe to run again:
1. Create the free project (step 1.1 below) and the free Resend account + domain (step 1.6).
2. GitHub → this repo → **Settings → Secrets and variables → Actions → New repository secret**: `SUPABASE_ACCESS_TOKEN` (from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → Generate new token) and `RESEND_API_KEY` (from [resend.com/api-keys](https://resend.com/api-keys)). Optional: `GOOGLE_CLIENT_SECRET`.
3. GitHub → **Actions → Set up Supabase → Run workflow** → paste your Project URL (`https://….supabase.co`) → **Run**. Green check = done. Then add the three Vercel variables (step 1.2) and redeploy.

The manual route, if you'd rather click through it:

**1. Database — Supabase (free)**
1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub → **New project** → organization plan **Free** → name it `theplatenextdoor`, pick a strong database password (save it), region **East US**. No card is asked for.
2. Project → **Settings → API Keys**. In Vercel → your project → **Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` (the Project URL), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the publishable key) and `SUPABASE_SECRET_KEY` (the secret key; server only, used for "Delete my account"). Older projects show `anon` / `service_role` keys instead; put them in `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, both work. (Vercel's **Storage → Supabase** button also fills these in for you; if you use it, pick the **Free** plan.)
3. Supabase → **SQL Editor** → paste all of `supabase/schema.sql` → **Run**. It's safe to run again after updates.
4. Supabase → **Authentication → URL Configuration**: Site URL `https://www.theplatenextdoor.com`; Redirect URLs `https://www.theplatenextdoor.com/**`, `https://theplatenextdoor.com/**`, `http://localhost:3000/**`.
5. **Authentication → Providers → Email**: keep it on, keep "Confirm email" on, set **Email OTP Length to 6**.
6. **Connect a free email sender (do this before the templates).** Supabase's built-in sender allows only a couple of emails an hour, and new free projects can't edit email templates until their own sender is connected (if Supabase says "upgrade your plan" on the templates page, this step is the free fix). Make a free [Resend](https://resend.com) account (Free plan: 3,000 emails a month, 100 a day, no card), add the domain `theplatenextdoor.com` (it asks for a few DNS records on a `send.` subdomain — add them in GoDaddy; they don't touch your Microsoft 365 email), then Supabase → **Authentication → Emails → SMTP Settings**: host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key, sender `emails@theplatenextdoor.com` (any address at the domain works; this one means replies reach your inbox), name `The Plate Next Door`.
7. **Authentication → Emails → Templates** (unlocked once step 6 is saved): in both **Magic Link** and **Confirm signup**, set the subject to `{{ .Token }} is your Plate Next Door code` and the body to:
   ```html
   <div style="margin:0;padding:24px 12px;background:#f4efe1;font-family:Arial,Helvetica,sans-serif;color:#22201c">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;margin:0 auto;background:#fbf8ef;border:1px solid #22201c">
       <tr><td style="padding:28px 28px 8px">
         <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#2c5a43;font-weight:bold">The Plate Next Door</p>
         <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;line-height:1.2">Here's your sign-in code</h1>
         <p style="margin:0 0 8px;font-size:15px;line-height:1.5">Type this code where you're signing in:</p>
         <p style="margin:0 0 22px;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:bold;letter-spacing:8px">{{ .Token }}</p>
         <p style="margin:0 0 14px;font-size:15px;line-height:1.5">Or tap the button to sign in right here:</p>
         <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#2c5a43;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px">Sign me in</a>
       </td></tr>
       <tr><td style="padding:22px 28px 26px;font-size:12px;line-height:1.5;color:#6b665b">
         The code and the button work once and expire in an hour. Didn't ask to sign in? You can ignore this email.
       </td></tr>
     </table>
   </div>
   ```
8. Optional, passkeys (free): **Authentication → Passkeys** → enable (relying party: `theplatenextdoor.com`), then add `NEXT_PUBLIC_PASSKEYS=on` in Vercel.

**2. Google sign-in (free, recommended: it sends no email)**
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (no billing account needed; skip any "start free trial" offer) → **Create credentials → OAuth client ID → Web application**. Authorized JavaScript origins: `https://www.theplatenextdoor.com`, `https://theplatenextdoor.com`, `http://localhost:3000`. Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`. Fill in the OAuth consent screen (name, logo, support email) and publish it.
2. Supabase → **Authentication → Providers → Google** → enable, paste the Client ID and Client Secret.
3. Vercel: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = that Client ID.

**3. Google Analytics 4 (free)**
1. [analytics.google.com](https://analytics.google.com) → Admin → **Create property** → web stream for `https://www.theplatenextdoor.com` → copy the Measurement ID (`G-…`). Leave Enhanced measurement on (it counts page changes in the app).
2. Vercel: `NEXT_PUBLIC_GA_ID` = that ID.
3. Admin → Events → mark `sign_up`, `add_to_wishlist`, `newsletter_signup`, `review` and `directions` as **key events**. Leave Google signals off (the privacy page promises no ad use).

Events sent (to GA4 and Vercel Analytics): `sign_up` / `login` (with method), `add_to_wishlist`, `stamp`, `spot_view`, `directions`, `website`, `share`, `review`, `photo_upload`, `surprise_spin`, `spot_submitted`, `newsletter_signup`, `passkey_added`. Signed-in sessions carry an anonymous member id (never an email) and a `home_city` user property. Visitors with Global Privacy Control never load Google Analytics, and anyone can switch it off on `/privacy`.

**4. Redeploy** (Vercel → Deployments → Redeploy). Then open `https://www.theplatenextdoor.com/api/health`; it should say the database and sign-in are awake. Sign in with `emails@theplatenextdoor.com` and you're staff (the Verification desk shows up). To add more staff, in the SQL Editor: `insert into public.admin_emails values ('name@example.com');`

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Supabase (added by the Vercel integration) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google Cloud OAuth client |
| `NEXT_PUBLIC_GA_ID` | Google Analytics web stream |
| `NEXT_PUBLIC_PASSKEYS` | `on` once passkeys are enabled in Supabase |
| `NEXT_PUBLIC_AUTH_CODE_LENGTH` | only if you change the code length from 6 |

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
