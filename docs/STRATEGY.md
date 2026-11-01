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
