# Strategy: a Letterboxd for Birmingham food that restaurants want to be on

November 2026. The plan behind the redesign, what to sell, and the order to do it in.

## What people come for

1. **What are my friends eating?** The front page is a feed. *For you* opens with The Thursday Plate (one fine dining, one casual, one wildcard), then members' reviews with their photos, with shelves of places in between so it's never empty. *Friends* is only the people you follow. Friends' ratings carry more weight than any algorithm's suggestion (the Letterboxd lesson), and Beli's feed of familiar faces is what keeps people opening it.
2. **Where should I go?** Explore: one search box, four filters in a row, every place as a cover. The map is one tap away (Map), never in the way.
3. **Just pick for me.** Surprise me, now with **lists**: a member names a list ("Casual", "Fine dining", "Vestavia", "Date night"), picks what goes in it by occasion, price, town, cuisine or by hand, and spins from just those. Lists are also the Letterboxd lists: shown on your page, built once, used every week.
4. **Keeping score.** Want to try, Been (the Plate Passport), reviews with photos.

The design rule: one idea per screen, space instead of boxes, pictures doing the talking, and nothing that a person has to read twice.

## Why restaurants will want in

What owners told researchers they lack is proof: ad platforms report clicks, not covers, and influencer posts run $100 to $2,500 each for one day of attention (Sauce's 2026 rate guide; Bloom Intelligence on attribution). Local food newsletters that cap their sponsors sell out at about $500 a month.

We have something none of them can show: **intent, counted**.

- **Want to try** is a promise to visit. "142 people in Birmingham have you on their want-to-try list" is the most valuable sentence we can send an owner.
- **Lists** say what people think a place is for ("Date night" on 31 lists).
- **Surprise me landings** and **directions taps** are the last step before the door.
- **Stamps and reviews** show the visit happened.

`/partners?spot=<id>` shows an owner those numbers for their own place, live (`app/api/snapshot`, counts only, never who). Send every owner their link.

### The hook: photos

Places without photos get a matchbook cover. They look good, and they look even better replaced. Every listing, free, can send its own photos (they go in `HOUSE_PHOTOS` in `lib/photos.ts`) and become the mouth-watering cover in every list, feed and Surprise. That's the first conversation with every owner, and it costs them nothing.

## What we sell (all labeled, none of it touches rank, reviews or Surprise me)

| | Price | What it is | Where it lives in code |
| --- | --- | --- | --- |
| Listing | Free | Claim, fix details, answer reviews, send photos, monthly numbers email | `/partners` form → `partner_leads` |
| Partner | $39/mo | Pick cover and photo order, "From the owner" posts, monthly report (saves, stamps, lists, Surprise landings, directions) | report numbers from `app/api/snapshot` and analytics events |
| Featured | $99/mo | The one Sponsored card at the top of Explore for a cuisine or neighborhood, plus one Featured post a month in *For you* | `sponsored: true` in `lib/data.ts`; `FEATURED` in `lib/sponsors.ts` |
| Presented by | ask | "The Thursday Plate, presented by …" on the email and the front page; one sponsor at a time, local brands (banks, markets) | `THURSDAY_SPONSOR` in `lib/sponsors.ts` |

Rules that keep it worth buying: one Featured card per cuisine and per neighborhood, at most one Featured post in any feed and never in *Friends*, a real photo required, and the word Sponsored right next to all of it.

## The order to do it in

1. **Photos first (weeks 1–4).** Email every owner their `/partners?spot=` link and ask for three photos. Set `GOOGLE_PLACES_API_KEY` in Vercel meanwhile: every place without its own photo then shows its first Google photo, credited (`app/api/pins` + `app/api/cover`, about one lookup per place a week, inside Google's free monthly allowance).
2. **Seed the feed (weeks 1–6).** Ten local editors with real names (`members.role = 'editor'`) writing two reviews a week with photos, so *For you* has something new every day and new members have people to follow.
3. **Founding partners (month 2).** Offer the first 25 places Partner at the founding rate, locked for a year. Scarcity is honest here: there's one Featured card per cuisine.
4. **Sell Featured by cuisine and neighborhood (month 3+),** starting where there's competition (cocktail bars downtown, brunch in Homewood). Show the owner the saves count for their category before the call.
5. **Presented by (once the list passes ~2,000 readers).** One local brand a month on The Thursday Plate.

## What to measure

Weekly: new members, reviews with photos, lists made, Surprise spins and landings ("Let's go"), saves per place. Monthly per place: saves, stamps, lists, reviews, directions taps. Those numbers are the product we sell; keep the events (`lib/analytics.ts`) honest and never sell anything they don't show.

---

# Part 2 (Nov 3): people, profiles, credibility, and how it pays

## What was wrong

- **No way in to people.** Following existed, but the only door was a hidden "Find people" button and tapping a name on a review. Nobody could search for a friend or browse reviewers.
- **Profiles were plain.** Initials only, no marks of credibility, reviews and photos you couldn't sort or filter.
- **The passport was a long scroll** with no way to undo a stamp except from the place's own page.

## What's built now

| | Where | Why it matters |
| --- | --- | --- |
| **People** page: search by name or @name, top reviewers this month, people you might know, invite friends | `/people`, desktop nav, "Find friends and local reviewers" on Home → Friends, "Find friends" on You, people show up when you type a name in Explore | Following is the engine of the feed (Letterboxd, Beli). Two taps to anyone. |
| **People to follow** shelf in the For you feed | `components/Home.tsx` | Discovery where people already are, not in a menu. |
| **Profile pictures** | tap your picture on You. Squared and shrunk on the phone, stored in your own folder; the database only accepts a picture from your own folder (`member_rules`) | Faces make reviews credible and the feed social. |
| **Marks next to names** (`lib/badges.ts`) | profile header, People, feed, reviews (the check) | See "The credibility ladder" below. |
| **Filterable reviews and photos** on every member's page | Reviews: All / 5★ / 4★ / 3★ and under / With photos, any cuisine, sorted newest, highest, lowest or most helpful. A Photos tab, filterable by cuisine, opens full screen. | Letterboxd-style browsing of a person's taste. |
| **Passport you can manage** | You → Passport → Your stamps: change how it went, take a stamp back (a second tap confirms), search when there are many. Neighborhoods and Trails are separate tabs. | Fixes accidental stamps; easier to navigate. |
| **Passport strip on Home** | under This week's three | People know it exists, without it taking over the page. |
| **Patron and Verified lists** | You → Settings | We measure demand before building payments (see below). |
| **Plate Invites list** | `/partners`, the form's "Plate Invites" option | The restaurant side of credibility (see below). |

## The credibility ladder

Credibility is the asset restaurants will pay to be near, so it is **earned and never sold**:

1. **Regular**: 5 reviews.
2. **Trusted reviewer**: 15 reviews and 20 Helpful votes from other people.
3. **Top reviewer**: in the top 10 for useful reviews in the last 30 days (`top_reviewers`: Helpful ×3, reviews ×2, photos ×1).

Separate from those, and never a sign of taste:

- **Verified** (the check): staff confirmed who someone is. Free for notable locals (chefs, food writers, owners); included for Patrons who confirm their identity. It never makes a review count more.
- **Local editor**: our own writers (`members.role = 'editor'`).
- **Owner**: someone who claimed a place (next: show it on their replies to reviews).
- **Patron**: supports the site.
- **Founding member**: joined before March 1, 2027. Free, permanent, and a quiet reason to join now.

This mirrors what works elsewhere: Google's Local Guides levels and Yelp Elite make status earned; Letterboxd sells Pro and Patron ($19 and $49 a year) for features and a supporter mark, never for influence.

## How each side pays (members never feel sold to)

**Members**
- **Plate Patron**, $3 a month or $24 a year (founding price kept for good): a Patron mark, Plate Wrapped (your year in food, made to share), a cover photo on your page, The Thursday Plate a day early. Start with a Stripe payment link once the list has ~100 names; set `members.patron_until` from the payment hook.
- **Verified**, part of Patron after an ID check, free for notable locals.

**Restaurants** (see Part 1 for Listing, Partner, Featured, Featured posts)
- **Owner mark** on a claimed listing: claiming is free, and it's how every owner enters the funnel.
- **Plate Invites** (next to build): a restaurant hosts a table of Trusted reviewers. Every review from an invited visit is labeled "Invited" in its first line and is left out of the score. That keeps it inside the FTC's 2024 rule: the meal can't be tied to a positive review, and the connection is disclosed where nobody can miss it. Price per table; cap how many invites a reviewer accepts a month so seats stay scarce.
- **Sponsored photo of the week**: a restaurant's own photo leading the For you feed for a week, labeled Sponsored.

**Local brands**
- "The Thursday Plate, presented by …" and seasonal trails (Part 1).

## Why restaurants will want in early (all of it true, none of it a trick)

- **They can see what they're missing.** An unclaimed place shows a matchbook where its neighbor shows a mouth-watering photo, plus "Is this your place?" on its page. The owner snapshot (`/partners?spot=…`) shows how many people want to try them.
- **Slots are scarce by design.** One Featured card per cuisine and one per neighborhood. Whoever takes "brunch in Homewood" first has it.
- **The founding rate.** The first 25 Partners lock their price for a year.
- **The reviewers are the audience.** Trusted reviewers are a small, visible group with followers. Invites put a restaurant in front of exactly them, honestly labeled.

## Next to build, in order

1. Stripe payment link for Patron; `patron_until` set by a webhook.
2. Owner accounts: a claimed listing links to a member; their replies to reviews carry the Owner mark.
3. Plate Invites: an `invited` flag on reviews, the "Invited" label, kept out of averages.
4. Plate Wrapped (December is the moment) and profile cover photos for Patrons.
5. A staff screen for reported members and pictures (today: Supabase table editor; clear `members.avatar_url` to take a picture down).

## What to watch

Follows per active member, % of reviews with photos, members reaching Regular and Trusted, Patron list sign-ups, verification requests, claimed listings, Invites interest. If follows per member stay under 3, put People higher on Home.
