# The Plate Next Door — Birmingham's locally owned food & drink map

**Skip the chains. Eat next door.** Pick what sounds good and where you're eating, and the map of Birmingham follows along. Locally owned places only: no fast food, no chains. *Neighbors feeding neighbors.*

**The brand**: the mark is a diner plate with a red band and a front door on it (`components/Brand.tsx`); the name, the line under it and the sign-off live in `lib/brand.ts`, so the voice is the same on every page, the share image and the app icon.

**The look** (Nov 2026 redesign; the plan and what to sell are in `docs/STRATEGY.md`): paper, ink, tomato red and ledger green, set like a good menu. Big serif names (Newsreader), plain sans for the facts (Libre Franklin), the script logo (Yellowtail) and matchbook covers (Big Shoulders), all self-hosted. Space instead of boxes, pictures doing the talking, one idea per screen. Styles: `app/ui.css` (the system) on top of `app/globals.css` (older pieces).

- **Home** (`/`, `components/Home.tsx`): a feed. *For you* opens with **This week's three** from The Thursday Plate, then members' reviews with their photos, with shelves of places in between (occasions picked for the time of day, no place on two shelves, the order shifting a little each day) and at most one labeled Featured post. *Friends* is only the people you follow, with Activity behind the bell.
- **Explore** (`/explore`, `components/ExploreView.tsx`): one search box, then Cuisine, Where, Price and Want to try in one row; every place as a cover in a grid. Sort and **Map** sit on the line under it. On a computer the map opens beside a numbered list; on a phone it takes the screen with swipeable cards.
- **The map**: drag, pinch, wheel, +/−; pins numbered to match the list. It only loads when you open it.
- **Names on the pins**: zoom in to neighborhood level and each pin's name prints beside it, wherever there's room (`placeNames` in `components/map-shared.tsx`).
- **Lists** (`/lists`, `components/ListsView.tsx`, `lib/lists.ts`): Want to try and Been, then your own. A list is a name plus rules (occasion, price, town or neighborhood, cuisine, "not been yet", "only want to try") and/or places added by hand (List on any place page). Public lists show on your page. Kept in the account (`user_lists`), or on the device until the database has the table.
- **Surprise me** (`components/Surprise.tsx`): pick where to spin from (Anywhere, your filters, Want to try, any of your lists, old favorites), the covers flip like a Rolodex and land on a pick. Weighted toward well-loved places, never toward paid ones.
- **Plate Passport** (`lib/passport.ts`, the Passport tab): tap **I've been** on any place to stamp it, then say how it went (Loved it / It was good / Not for me). Shows how many of the listed places you've stamped, stamps by neighborhood, milestones (1, 5, 10, 25, 50, all), a forgiving weekly streak (a quiet week doesn't break it), trails (`lib/trails.ts`: a seasonal coffee trail, Over the mountain, Meat-and-threes) and a share card drawn in the browser (progress, not places). **Where have you eaten already?** lets people stamp the places they've been in one go, so nobody starts at zero. It's for members (signing in takes seconds, no password) and follows them to every device.
- **Restaurant page**: name, the basics and what to order first, then **reviews**, then awards (dated, each links to where it was announced; `lib/honors.ts`), Want to try / I've been, photos, the write-up, Directions & hours, nearby places, and who checked it and when, with **Report a change**.
- **Sort**: Most loved, **Nearest to me** (asks for your location only when you pick it), Top rated, A to Z. Nobody can pay to move up.
- **Trust**: a one-line promise under the headline (every place checked by a person, nobody pays to rank), and `/about` (**How we pick**): what counts as locally owned, how places get on, keeping it current, how we make money, and the review rules. Put your name and email in `FOUNDER` in `lib/brand.ts`; named people are one of the strongest trust signals a new site has.
- **Keyboard**: `/` search · `Esc` back · `S` surprise.

## Coverage today

The **Birmingham area**, by town: Birmingham (Downtown, Southside, Lakeview, Avondale & Forest Park), **Homewood** (downtown/SoHo, Edgewood, West Homewood), **Mountain Brook** (Mountain Brook Village and Lane Parke, English Village, Crestline), **Vestavia Hills** (Cahaba Heights, Highway 31, Rocky Ridge, Liberty Park), **Hoover** (Patton Chapel), and **Worth the drive** (Irondale, Dickey Springs, Alabaster) for the few places further out that people drive for.
- 140 places, including all 11 Birmingham places in Michelin's first American South guide (2025), and the city's bars: cocktail bars, dives, sports bars, wine bars and breweries. Checked against local news (Bham Now, Homewood Star, Village Living, Vestavia Voice, Over the Mountain Journal) in October 2026. Known closures were left off: Satterfield's, Sol y Luna, Post Office Pies, DeVinci's, Iron City Pizza, Revelator Coffee (all), Hero Doughnuts (now Full Circle), Rodney Scott's, Joyland, Marty's PM, Ghost Train Brewing, Nabeel's, Ocean, Tasty Town, Queen's Park and Nana Funks.
- **One listing per place.** A local place with more than one location (Big Spoon, Brick & Tin, Cala Coffee, El Barrio, Jim 'N Nick's, Paramount, Taco Mama) is one listing with every location on it (`also` in `lib/data.ts`). It counts in each neighborhood it's in, and its pin moves to the location in the part of town you pick, or the nearest one when sorting by distance. Old per-location links redirect (`SPOT_ALIASES`), and saves and stamps carry over. Saw's BBQ and Saw's Soul Kitchen stay separate: different restaurants, same family.
- **Off for now** (Oct 2026): DG, Green Acres, Eagle's and Fife's.
- **Chains**: locally owned places, plus names born in the Birmingham area even when they've grown or franchise (Saw's, Taco Mama, Jim 'N Nick's, Golden Rule, Dreamland, which is run from Birmingham). Chains that started somewhere else stay off even when a local franchisee runs the store here (Moe's Original BBQ, Martin's, Jack Brown's, Mellow Mushroom, Momma Goldberg's, New York Butcher Shoppe, Original Pancake House, Wooden City, Lapeer, Epice), and so do drive-thru-only shops. `lib/chains.ts` flags those names on member submissions.
- **Exact pins, free**: a GitHub Action (`.github/workflows/pins.yml`) looks every place up on OpenStreetMap, which needs no key and no card. It saves the results to `lib/geo-overrides.json` and commits them, and Vercel redeploys. It runs by itself whenever `lib/data.ts` changes and on the 1st of every month, and keeps its own schedule switched on, so there is nothing to do by hand. A pin only moves if the match is within 3 km of where it was.
- **Optional Google key** (`GOOGLE_PLACES_API_KEY`, paid after Google's free allowance): adds Google photos and ratings, refines pins further, and drops places Google marks *permanently* closed (never closed-for-the-night or temporarily closed). See `/api/pins`.
- Other Alabama cities are already defined in `lib/regions.ts` with status `"later"`. To open one, change it to `"founding"` (members add places, staff verify) or `"live"`.

## Phones first

On a phone the site works like an app: a top bar with the logo, and a bottom tab bar with **Home · Explore · Surprise · Lists · You** (Surprise in the middle, in red). Everything that opens over the page is a sheet from the bottom you can drag down to close; on a computer the same sheets are small centered panels. Tap targets are 44px or more, spacing is on a 4px grid with a 16–20px gutter, and inputs are 16px so iPhones don't zoom.
- **A place**: its cover at the top (Back and Share float on it), the name, four actions (Want to try, Been, Review, List), what to order, photos, reviews, then where it is: a little printed locator drawn from our own data (`components/LocatorMap.tsx`, no tiles to download) and Directions. On a computer the locator and links sit in a column on the right.
- **You** (`/me`): name and @name, Been / Want to try / Lists counts, your Plate Passport, then your reviews, photos, the places you've added and settings.
- **Home screen**: it can be added as an app (manifest and app icon included).

## Reviews

The main part of the site, and the first thing under a place's name. Rules and arithmetic live in `lib/reviews.ts`; the database enforces the same rules (`supabase/schema.sql`, `review_rules`).

**Writing one** (members only, one per place, editable; an edit says "Edited"):
- **A 1–5 score where every step has words**: 5 One of the best, 4 Great, 3 Good, 2 Just okay, 1 Skip it. Labeled scales are the best-tested fix for everything piling up at 4.5 (Garg & Johari, *M&SOM* 2021). The form says "3 means good. Save 5 for the best in town."
- **Would you go back?** (yes/no) and **what did you get?** (1–3 things, tap a suggestion or type). These become "67% would go back" and the "People got" chips, which tell readers more than a decimal.
- **One paragraph, 100–600 characters**, with a counter; line breaks fold into one paragraph. Yelp's useful reviews average about 460 characters and almost none under 100 help; usefulness rises with detail and then flattens (Mudambi & Schuff, *MISQ* 2010).
- **The month you went** (last two years), optional **Good for** tags (up to 3) and optional food/service/vibe scores (worded for the place: Drinks, Coffee, Food & drinks…).
- **A promise**: "I went myself. I don't own, work at or compete with this place, and nobody gave me anything." That's the FTC's 2024 rule on fake, insider and paid reviews (16 CFR 465).
- **Up to 3 photos** (optional): the food, the room, the people they went with. They show under the review (tap for full size), in the Friends feed, and with the place's photos. The database checks they're on the writer's own review (`photo_rules`), and a deleted review takes its photos.
- Five reviews a day per member. A review stamps your passport (unless you already chose how it went).

**Reading them**: the score in words, the count and the share who'd go back; a five-bar chart you can tap to filter (people trust the shape more than the number, per Baymard); detail scores once three people gave them; "People got" and "Good for" with counts; then the two most useful reviews, always including a critical one when at least 1 in 10 are. **See all** sorts by Most helpful, Newest, Highest or Lowest. Under three reviews there's no average, just each review. A "last 12 months" line shows when it differs from all time by 0.3 or more.

**Fairness**: three labeled reactions (below), and only **Helpful** sorts reviews. **Report** asks why; three reports hold a review until staff look (held reviews don't count, and only their writer sees them). Negative reviews are never hidden for being negative. "Top rated" ranks by an average pulled toward the site's when a place has only a few reviews, so one 5 can't top the list. Sponsors and partners can't touch reviews, their order or moderation. The public rules are on `/about#reviews`.

**After deploying**: run Actions → **Set up Supabase** again (or paste `supabase/schema.sql` into the SQL editor) to add the new review columns, Helpful votes and reports. Until then reviews still post, with the score and paragraph only.

## Friends

Letterboxd for local food, built from the research in `reports/` (Oct 2026: Letterboxd, Beli, Untappd, Strava, Yelp, NN/g). Rules and arithmetic live in `lib/social.ts`; the database enforces the same rules (`supabase/schema.sql`, the Friends section) as triggers and policies, so no client can skip one.

- **Follow, Letterboxd-style.** Following someone public is instant; a member can switch on **Approve followers** and then each follow is a request. People who follow each other are **Friends**. No contact upload, no phone number, no invite wall. Every member gets an **@name** (3–20 letters, numbers or `_`, starting with a letter) made from their name; they can change it right away, then once a month, and an old @name keeps pointing to them for 90 days.
- **The feed** (`/friends`, the Friends tab): what the people you follow did, newest first, never ranked. Reviews get a full card; visits, want-to-go saves and follows by one person in a day fold into one line. Chips: All, Reviews, Visits, Friends only. **Everyone** is the latest reviews from all public members, so a new member has something to read and someone to follow. **Popular with people you follow** shows places two or more of them went lately. The map lights up the places in the feed.
- **A member's page** (`/u/[handle]`): name, @name, a line about them, counts, and **You agree on 7 of 9 places you've both been** once you share 5 (scores within a point count as agreeing; a plain count beats an opaque %, which Beli users distrust). Their **Top 4** (or their highest rated), then **Places** (filter Loved/Reviewed, kind of place, town, "only ones I haven't been"; sort highest rated, recent, A–Z; each row shows how *you* rated it), **Reviews** and **Want to go**. The map shows the same places.
- **Reactions**: Helpful, Want to go (also saves the place to your list) and Thanks. Three labeled chips, no free emoji, no negative one; counts are public, who reacted isn't (the writer is told). You can't react to your own review.
- **Comments**: one level of replies (answering a reply joins its thread, @name filled in), 500 characters, editable for 15 minutes ("Edited"), "Comment deleted" kept only when it has replies. 30 seconds apart, 20 an hour, 100 a day (10 a day for accounts under 72 hours old). A "talk about the food, not the person" line and a second look for jabs at people. The review's writer can hide comments or limit them to people they follow, or turn them off. Three reports hold a comment for staff (two for a brand-new account). Inline on a computer; a sheet on a phone that Back closes and that rides above the keyboard.
- **Activity** (the bell, the Friends tab's dot): follows and requests (Accept / Decline), comments, replies, @mentions, reactions (folded: "Ana and 3 others found your review helpful") and gift notes. Checked once a minute while the page is open; never about your own actions or from anyone you blocked or muted.
- **On a place's page**: "Ana and Cal have been · friends' average 4.3", and their reviews first.
- **Privacy and safety**: email never leaves `profiles`; everything other members can read is in `members`. **Share my passport** and **Share my want-to-go list** are on for new members and **off for anyone who joined before Oct 19, 2026** (the site had promised the passport was private). Visits show the day, never the time. **Block** is two-way and silent and ends follows; **Mute** is one-way and silent; **Remove follower** is silent. Members can be reported (impersonation, harassment, spam, under 13…). Follows are capped at 60 an hour and 200 a day. Member pages are `noindex`. Deleting an account deletes all of it.
- **Settings** live on your page (Edit profile) and on Passport → Edit your page & privacy.

**After deploying**: paste `supabase/schema.sql` into Supabase → SQL Editor → Run (it only adds what's missing). Until then the site works as before; Friends shows "needs its update".

## People & profiles (Nov 2026)

- **People** (`/people`, `components/PeopleView.tsx`): search by name or @name, top reviewers this month (`top_reviewers`), people you might know, invite friends. Also on Home → Friends ("Find friends and local reviewers"), You ("Find friends"), and in Explore (people whose name matches the search).
- **Profile pictures**: tap your picture on You. Squared and shrunk on the phone, stored in your own folder in `spot-photos`; the database only accepts a picture from your own folder. To take one down, clear `members.avatar_url` in Supabase.
- **Marks** (`lib/badges.ts`): earned ones (Regular at 5 reviews; Trusted reviewer at 15 reviews and 20 Helpful votes; Top reviewer for the month), plus Verified (staff set `members.verified`), Local editor, Patron (`members.patron_until`) and Founding member (joined before March 1, 2027). Members can't set Verified or Patron on themselves. None of them changes how a review counts.
- **A member's page**: picture, marks, bio, Follow, Share; Reviews / Been / Followers / Following; Top 4 as covers; Places, Reviews (filter by score, with photos, cuisine; sort newest, highest, lowest, most helpful), Photos (filter by cuisine) and Want to go.
- **Passport**: You → Passport → Your stamps lets members change how a visit went or take a stamp back. A one-line passport strip sits under This week's three on Home.
- **Patron and Verified** (You → Settings) and **Plate Invites** (`/partners`) collect interest by email for now. The plan is in `docs/STRATEGY.md`, Part 2.

## Gift cards

We never sell cards, take payment or hold a balance: selling another business's stored value would make the site a money transmitter in Alabama (license, bond) and Stripe restricts it. Giftly-style "cash with a suggested place" was sued by restaurants it listed without consent. So **Gift card** sends you to the place's own page, labeled "Sold by Rojo through Instagift", and the restaurant keeps every dollar. Details and sources: `reports/Friends feed and gift cards.md`.

- **Where**: a **Gift card** button on a place's page, **Treat Ana to a gift card** on a member's page (her Top 4, want-to-go list and highest rated, giftable ones first, each with why: "Ana wants to go"), and **Gift** on her list rows.
- **The list** (`lib/gifts.ts`): only places whose own website links to a gift card page, or whose seller page we opened and it named the place. 13 as of Oct 2026 (Big Spoon, Brick & Tin downtown, CharBar No. 7 (mailed), Current Charcoal, The Fish Market, Ovenbird, Paramount downtown, Red Cat, Rojo, Slice Lakeview, Surin, Yo' Mama's, Back Forty). Multi-location places note which location's card it is. About 90 places haven't been checked; see To do.
- **Counting**: links go through `/go/gift/[id]`, which logs place, seller and where on the site (never who) to `gift_clicks`, then redirects. That count is what to show restaurants later.
- **For friends**: after buying, a friend (you follow each other) can get a note on the site: "Will sent you a gift card to Helen. Check your email." Ten a day at most.
- **Later, with restaurant partners**: Square's Gift Cards API (the restaurant stays the seller), a co-branded community card with Yiftee, and a lawyer before the site ever touches money.

## Real photos

**The picture beside a place's name is the front of the place**, the same one its page opens with, so a place looks the same before and after you tap it (`frontFor` in `lib/photos.ts`). In order:
1. **A member's photo the team featured** (Verification desk → Photos → Feature). One per place; featuring another swaps it, so the team can change it every so often (a good shot with friends in it, say).
2. **A cover the restaurant supplied** (Galley & Garden), credited and linked to the restaurant, and listed on `/credits`. Put the file in `public/photos/` (a full size and a 600px one) and add it to `HOUSE_PHOTOS` in `lib/photos.ts`.
3. **A member's photo of the front** (the newest).
4. An openly licensed photo of the place (Johnny's, Good People).
5. **Google's first photo of the place**, credited, once `GOOGLE_PLACES_API_KEY` is set (`app/api/pins` asks for it in the same weekly lookup as the pins, at no extra cost; `app/api/cover` serves it without exposing the key, cached a week).
6. Otherwise **a matchbook cover**, unique per place: its name set in one of four styles and ten inks (`components/Cover.tsx`). Honest about having no photo yet, and a reason for owners to send theirs.

**Every photo members add** (with a review, on a place page, or with a place they add) goes up right away, and the team gets an email with the picture in it so they can check it (`app/api/notify`). **Photos** in the Verification desk lists them newest first, to take one down or feature one.

Below the first picture, the place page shows the rest, in this order:
1. Member uploads, including review photos.
2. Openly licensed photos taken at the place itself, credited on the page. Add more in `PLACE_PHOTOS` in `lib/photos.ts`.
3. **Google Places photos** of the building and the food, once `GOOGLE_PLACES_API_KEY` is set. `npm run geocode` also saves each place's Google ID, so photo lookups are a single cheap call.
4. (Not shown any more: the place page only shows real photos of the place. The stock library below stays for `/credits` and old links.) **Stock photos of the dishes each place is known for**. About 50 photos were hand-picked from Wikimedia Commons, all licensed for commercial use (CC0, public domain, CC BY, CC BY-SA). Each place is mapped to its own dishes in `lib/photos.ts`: white sauce chicken at Saw's, shrimp and grits at Dyron's, a Cubano at Kool Korner. Member-added places fall back to their kind of food. Stock photos carry a yellow **stock** tag and credit their photographer. Every one is listed on `/credits`.

Images are served at sizes that fit the screen (`srcset`), load lazily, and fade in once decoded. On a phone the food photos are a strip you swipe sideways. The viewer shows each photo whole, not cropped, and you can swipe between them.

Photos copied off restaurants' websites or Instagram aren't used unless the restaurant says yes. They're copyrighted. A restaurant's cover goes in only with its OK.

## The Thursday Plate

The weekly email, and **This week's three** on the front page: **one fine dining, one casual, one wildcard**, new every Thursday (`lib/letter.ts`).

- **Picked on its own.** Fine dining is a sit-down place at $$$ or more; casual is $–$$; the wildcard is anything, leaning toward the bars, coffee and sweets, the places fewer people know and the ones worth the drive. Well-loved places come up more often, nothing repeats within eight weeks, and everyone sees the same three.
- **Changed by the team when they want.** Verification desk → **Thursday letter** shows this week and the next two: swap any pick (any place, community ones too), add a line about it (it replaces our description), write a note for the top, or **Skip this week**. **See the email** shows it as it'll go out; **Send me a test** emails it to you.
- **Sent on its own.** Vercel runs `/api/letter/cron` once a day (`vercel.json`). Tuesday the team gets a copy of Thursday's letter with a link to the desk (and the picks are locked in, so a place added mid-week can't shift them). Thursday about 8 a.m. Central it goes to everyone on the list, 100 at a time, each person once. If the email service stops it (Resend's free plan sends 100 a day, sign-in codes included), Friday finishes the rest. A week that didn't start Thursday never goes out late.
- **In each email:** the three, each with a photo of the front when there's a real one, the kind of food, part of town, price, what to order and why; places members added that went up that week; **Stop these emails** (one tap, and mail apps' own unsubscribe button), View in a browser (`/api/letter`), and the mailing address.
- **Needs** `SUPABASE_SECRET_KEY` and `RESEND_API_KEY` in Vercel, and a postal address for the footer (US law asks for one; a PO box works) in `MAILING_ADDRESS` in `lib/brand.ts` or `LETTER_ADDRESS` in Vercel. `/api/health` says what's missing. Optional: `CRON_SECRET` (any long random text) so only Vercel can run the daily job.

## Community spots & verification

- **Add a spot**: any signed-in member can submit a place they've been to, from the top bar, the "Know a spot we're missing?" card, or a founding city's banner. The form asks for name, genres, price, address and a pin, neighborhood, "known for", a description, optional website, phone and storefront photo, and two confirmations (*I've been here* and *it's independent*).
- **Guardrails before submit**: names that match a national chain or fast-food list are flagged (`lib/chains.ts`). Spots already on the map are flagged as duplicates by name and distance. No map to fiddle with: the address is looked up as soon as you leave the box (Google Places with a key; otherwise, free, the US Census geocoder, which knows suburban house numbers, then OpenStreetMap), tidied, and the neighborhood is filled in from the nearest place already listed. A map to place it by hand appears only if the address can't be found. A member can have at most 10 submissions pending at once.
- **An email for every new place**: the team gets one at `emails@theplatenextdoor.com` with every field, the photo they sent (shown in the email, to check it's appropriate) and a button to the Verification desk; Reply writes back to the member who sent it (`app/api/notify`). Needs `RESEND_API_KEY` in Vercel. Each place is emailed once, and the keepalive workflow catches any that slipped through.
- **The For restaurants form emails the team too** (claiming a listing, **Report a change** on any place, Featured or sponsor interest), with Reply going to the sender (`app/api/contact`). It's also saved in `partner_leads`.
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
- [ ] **The Thursday Plate: a note when a pick is on someone's want-to-try list.** (The email itself is built; see **The Thursday Plate**.)
- [ ] **Founder name and email.** Fill in `FOUNDER` in `lib/brand.ts`. The "Who we are" part of `/about` shows up once a name is set. A named person you can write to is one of the strongest trust signals in the research.
- [ ] **Michelin American South 2026** comes out Oct 21, 2026. Update `lib/honors.ts` (new badges, changed or dropped ones) and the Award winners row follows. Add any newly recognized local places to `lib/data.ts`.
- [ ] **The rest of the owner's list (Oct 2026).** Still to confirm open in 2026 before adding: Café Dupont, Blueprint on 3rd, Bocca, Makarios, Falafel Café, Bay Leaf, EastWest, Shu Shop, Mr. Shawarma, June Coffee, Uncle G's (Hop City), The Standard (Pizitz), Porch, Hello Bakery, Whiskey Foxtrot (Homewood), Hamburger Heaven (Homewood), Mr. Chen's (Homewood), Mexico Lindo, Mr. P's Deli and Creekside BBQ. Still to check who owns or where they started: Otoro Hibachi, Waldo's Chicken & Beer, Baumhower's, Overtime Grill. Henrietta's Deli needs its new Trussville address.
- [ ] **Re-check the list** every few months: closures, new owners, prices. Bump `CHECKED` in `lib/brand.ts` when done.
- [ ] **The iPhone app.** Built and ready to sign; the steps that need your Apple account and a Mac are in **iPhone app** below.
- [ ] **Owner setup:** Supabase, Google sign-in and Google Analytics (see **Accounts, database & analytics**), payments for Partner and Sponsored (Stripe payment links are the simplest start), and turning on Vercel Analytics.
- [ ] **Reviews, next:** owner replies (claimed owners, one per review, free for everyone), a staff screen for reported and held reviews (today: Supabase table editor, `reviews.status`), and once a few hundred reviews are in, "top 10% of Birmingham coffee" style rankings.
- [ ] **Gift cards for the rest of the list.** About 90 places weren't checked (search limits and Toast's bot wall). Open each place's site and its Toast/Square page by hand, then add to `lib/gifts.ts`. Toast pages that say "Gift Cards Unavailable" (Paper Doll, Woody's, Carrigan's in Oct 2026) don't count. Re-check the list every few months.
- [ ] **Listing fixes the gift card audit turned up** (confirm, then fix in `lib/data.ts`): Yo' Mama's moved to 2024 4th Ave N (Jan 2025, per Bham Now); Ovenbird's site says 2810 3rd Ave S, Suite 200; The Essential's Toast page says 2215 1st Ave N; Saw's Soul Kitchen's Toast page now reads "Saw's BBQ Avondale"; check whether TrimTab is still open and Pizzeria GM's "closed" banner is old. (Salice is confirmed correct.)
- [ ] **Friends, next:** profile pictures (uploads, with moderation), local editor accounts (`update members set role = 'editor' where handle = '…'` in Supabase) so new members have people to follow, invite links that make both people follow each other, a weekly email digest with one-click unsubscribe, a per-review comment switch, owner responses, and a staff screen for reported comments and members (today: Supabase table editor, `review_comments.status`, `member_reports`).
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
3. Supabase → **SQL Editor** → paste all of `supabase/schema.sql` → **Run**. It's safe to run again after updates. After that, updates go in by themselves: every production deploy runs `scripts/migrate-db.mjs` first, which applies a changed `schema.sql` in one all-or-nothing transaction using the database connection the Vercel ↔ Supabase integration adds (`POSTGRES_URL`). `/api/health` says `"databaseUpdates": "automatic"` when that's working, and `"friends": "ready"` once the Friends tables are in.
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
| `POSTGRES_URL` | the Vercel ↔ Supabase integration; lets each deploy update the database |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) (the same free account that sends sign-in codes); turns on the team's emails (every place and photo people add) and The Thursday Plate. `NOTIFY_EMAIL` changes who gets the team's emails (default `emails@theplatenextdoor.com`) |
| `LETTER_ADDRESS`, `CRON_SECRET` | The Thursday Plate: the postal address for its footer (or set `MAILING_ADDRESS` in `lib/brand.ts`), and optionally a secret so only Vercel runs its daily job |
| `APPLE_TEAM_ID`, `APNS_KEY`, `APNS_KEY_ID`, `IOS_BUNDLE_ID`, `PUSH_WEBHOOK_SECRET` | the iPhone app (see **iPhone app**) |

## iPhone app

`native/` is the iPhone app: a native shell ([Capacitor 8](https://capacitorjs.com/docs), Swift Package Manager, iOS 15 and up, iPhone only) that opens www.theplatenextdoor.com. Every fix and new place on the site is in the app the moment Vercel deploys, with no App Store update. Without a connection it shows a "No connection" screen instead of a blank page.

**What the app does that the website can't** (`lib/native.ts`, and the reason it passes Apple's "not just a website" rule, 4.2):
- **Nearest** uses the phone's location through the app's own permission prompt. It stays on the phone.
- **Share** opens the iOS share sheet for places, member pages and the passport card.
- **A light tap** in the hand on save, stamp, follow and react.
- **Notifications** for replies, comments, @mentions, follow requests, accepted requests and gift notes. Asked once from the Activity tab, never at launch; reactions and plain follows stay in the app. `app/api/push` sends them through Apple (APNs).
- **Links open the app.** A theplatenextdoor.com link tapped in Messages or Mail opens that page in the app (`/.well-known/apple-app-site-association`).
- **Stays signed in.** The session lives in the app's own storage, which iOS doesn't clear the way it can clear website storage.

**What changes on the site inside the app:** no Google sign-in button (Google blocks its sign-in inside apps, and offering it would also mean adding Sign in with Apple, rule 4.8), so members sign in with the emailed code. Google Analytics doesn't load, so there's no tracking prompt.

**Already in place for App Review:** `/terms` with zero tolerance for abuse, Report on every review, comment and member, Block, a filter for slurs and threats (`lib/moderation.ts`, `banned_terms`), a contact email (rule 1.2); deleting your account in the app (5.1.1(v)); the privacy policy with an iPhone app section; specific permission wording for location, camera and photos; the privacy manifest (`native/ios/App/App/PrivacyInfo.xcprivacy`); 13+ in the terms.

**What you need to do, in order:**
1. **Apple Developer Program**, $99 a year ([enroll](https://developer.apple.com/programs/enroll/)). Individual is fine; your name shows as the seller.
2. **A Mac with Xcode 26 or newer** (yours, a friend's, or a cloud Mac). On it:
   ```bash
   cd native && npm install && npx cap sync ios && npx cap open ios
   ```
   In Xcode: the **App** target → **Signing & Capabilities** → pick your team. If `com.theplatenextdoor.app` is taken, change the bundle ID there and set `IOS_BUNDLE_ID` in Vercel to match. Push Notifications and Associated Domains should already be listed (from `App/App.entitlements`).
3. **Push key.** [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list) → **+** → check **Apple Push Notifications service (APNs)** → download the `.p8` file (you only get it once). In Vercel → Environment Variables add `APNS_KEY` (open the file in a text editor and paste all of it), `APNS_KEY_ID` (shown next to the key), `APPLE_TEAM_ID` (Apple Developer → Membership details) and `PUSH_WEBHOOK_SECRET` (any long random string). Redeploy. `https://www.theplatenextdoor.com/.well-known/apple-app-site-association` should now show your team and bundle ID.
4. **Supabase.** The `push_tokens` table goes in with the next deploy (see step 1.3 of the setup). Then **Database → Webhooks → Create a new hook**: name `push`, table `notifications`, event **Insert**, type **HTTP Request**, method POST, URL `https://www.theplatenextdoor.com/api/push`, add an HTTP header `x-push-secret` with the same secret.
5. **Sign-in email.** In the app, people type the code. The "Sign me in" button in the email opens Safari and signs in there instead, so the app doesn't mention it. (Removing the button from the template in step 1.7 above makes the email code-only everywhere.)
6. **A reviewer account.** Apple has to be able to sign in, and the code goes to an inbox. Make a Gmail just for this, sign in to the site with it once, and put the Gmail address and password in the review notes. Don't let it expire or delete it.
7. **Test on your phone.** Plug it in, pick it in Xcode, press Run. Check: Nearest asks for location once; Share opens the share sheet; Activity → Turn on notifications, then have a friend comment on your review; a theplatenextdoor.com link in Messages opens the app; airplane mode shows "No connection".
8. **App Store Connect** → Apps → **+ New App**: iOS, name `The Plate Next Door`, English (U.S.), your bundle ID, SKU `platenextdoor-ios`. Then:
   - Category **Food & Drink**. Price **Free**.
   - Screenshots from the iPhone simulator at **6.9"** (1320×2868) and **6.3"** (1206×2622), 3 to 10 each. The icon comes from the build.
   - **App Privacy**: Contact info → Email address; Identifiers → User ID; User content → Photos and Other user content (reviews, comments); Name. All linked to the person, not used for tracking, for App Functionality. Usage data → Product interaction, not linked, for Analytics (Vercel Analytics). Location: not collected, since it never leaves the phone.
   - **Age rating**: answer as it is. Social Media and user-generated content are yes; alcohol references are yes (bars). Expect 13+.
   - **Review notes**: the reviewer Gmail and password; that it's a guide to locally owned places with friends, reviews and comments; the native features listed above; that content is moderated by the word filter, Report, Block and a person reading reports within 24 hours; that gift cards link out to each restaurant's own page and nothing is sold in the app.
9. **Ship it.** Xcode → **Product → Archive → Distribute App → App Store Connect**. Try it through **TestFlight** first, then **Submit for Review**.

**After launch:** read reports every day (the terms promise 24 hours): `member_reports`, `comment_reports` and held reviews in the Supabase table editor. The app's code only changes when the native shell does (a new plugin, a new permission); bump the version in Xcode and archive again then. Texas (and soon Utah and Louisiana) added age-check rules for app stores in 2026; whether a free app with no purchases has to do anything is a question for a lawyer.

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
| Listing (free) / Partner $39 a month / Featured $99 a month | `/partners`. Leads go to `partner_leads`. `/partners?spot=<id>` shows the owner live counts for their place (saves, stamps, lists, reviews; `app/api/snapshot`, needs `SUPABASE_SECRET_KEY`). Partner is presentation and a monthly report; it never changes order |
| Featured: Sponsored card | set `sponsored: true` on a spot. One card labeled **Sponsored** at the top of Explore once someone has picked a kind of food or part of town. At most one per kind of food and one per neighborhood. Never in rankings, awards or Surprise me |
| Featured: post in *For you* | add it to `FEATURED` in `lib/sponsors.ts` (the restaurant's photo, a headline, dates). At most one in any feed, never in *Friends*, labeled Sponsored |
| "Presented by" | `THURSDAY_SPONSOR` in `lib/sponsors.ts`: a line on This week's three (and the email) |
| "Own a local place?" line | far down the *For you* feed, and on every place page ("Is this your place?") |
| Claim-your-listing CTA | bottom of every spot page (pre-fills the partner form) |
| The Thursday Plate email | the signup at the end of the list goes to `subscribers`. Sponsorship inventory |
| Partner analytics | Vercel Analytics events: `spot_view`, `directions`, `website`, `share`, `review`, `photo_upload`, `surprise_spin`. These are the numbers in partner reports |
| SEO | a static page per spot (`/spot/[id]`) with Restaurant JSON-LD, sitemap and OG image |

Trust rules (on `/partners` and `/about`): nobody pays to rank; anything paid says **Sponsored** right next to it; owners can't buy, edit or remove reviews; reviews come only from members and show their date. The research behind this (FTC review rules, what sank Yelp's trust, what local media charge) is in the redesign research report.

## Stack

Next.js 14 (App Router) · React 18 · Newsreader, Libre Franklin, Yellowtail and Big Shoulders (self-hosted) · MapLibre GL with OpenFreeMap vector tiles, drawn in the site's own style (`lib/map-style-print.ts`; Leaflet and plain OpenStreetMap tiles when WebGL is off or the tiles are down) · Framer Motion · Supabase (optional).
