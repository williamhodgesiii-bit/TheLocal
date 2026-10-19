"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@/lib/analytics";
import type { Review } from "@/lib/backend";
import { AREA_BY_ID, GENRES, GENRE_BY_ID, TOWNS, areaLabelOf, locationsOf, priceLabel, type GenreId, type Spot, type TownId } from "@/lib/data";
import { giftFor } from "@/lib/gifts";
import { RATING_WORDS } from "@/lib/reviews";
import {
  MATCH_MIN,
  MEMBER_REPORT_REASONS,
  VERDICT_WORDS,
  placeScore,
  profilePath,
  type MemberPage as Page,
  type MemberPlace,
  type Person,
} from "@/lib/social";
import { FeedReviewCard } from "./Friends";
import GiftSheet from "./GiftSheet";
import { Thumb } from "./Photo";
import { Avatar, FollowButton, PersonRow } from "./People";
import Portal from "./Portal";
import ProfileSettings from "./ProfileSettings";
import { useApp } from "./Providers";
import { Stars } from "./Stars";
import type { Pins } from "./Friends";

type Tab = "places" | "reviews" | "want";
type Show = "all" | "loved" | "reviewed";
type Sort = "rating" | "recent" | "az";

/**
 * A member's page, Letterboxd-style: who they are, their Top 4, then every place they've rated,
 * filterable, with how you rated it beside theirs. The map lights up the same places.
 */
export default function MemberPage({
  handle,
  spotById,
  onOpen,
  onPins,
  onBack,
  onHandle,
}: {
  handle: string;
  spotById: Record<string, Spot>;
  onOpen: (id: string) => void;
  onPins: (p: Pins) => void;
  onBack?: () => void;
  /** their @name changed (or the link used an old one): fix the address bar */
  onHandle: (h: string) => void;
}) {
  const { backend, user, been, saved, toast } = useApp();
  const [page, setPage] = useState<Page | null | undefined>(undefined);
  const [places, setPlaces] = useState<MemberPlace[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [tab, setTab] = useState<Tab>("places");
  const [show, setShow] = useState<Show>("all");
  const [kind, setKind] = useState<GenreId | "all">("all");
  const [town, setTown] = useState<TownId | "all">("all");
  const [sort, setSort] = useState<Sort>("rating");
  const [notMine, setNotMine] = useState(false);
  const [net, setNet] = useState<null | "following" | "followers">(null);
  const [gift, setGift] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setPage(undefined);
    setPlaces(null);
    setReviews(null);
    backend
      .memberPage(handle)
      .then((p) => {
        if (!live) return;
        setPage(p);
        if (p && p.member.handle !== handle) onHandle(p.member.handle);
        if (p?.visible) {
          backend.memberPlaces(p.member.id).then((x) => live && setPlaces(x), () => live && setPlaces([]));
          backend.memberReviews(p.member.id).then((x) => live && setReviews(x), () => live && setReviews([]));
        } else {
          setPlaces([]);
          setReviews([]);
        }
      })
      .catch((e) => {
        if (!live) return;
        setPage(null);
        toast(e instanceof Error ? e.message : "Couldn't load that page.", "err");
      });
    return () => {
      live = false;
    };
  }, [handle, backend, user?.id, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const mineToo = page && user?.id === page.member.id;
  const known = useMemo(() => (places ?? []).filter((p) => spotById[p.spotId]), [places, spotById]);
  const rated = useMemo(() => known.filter((p) => p.rating || p.verdict || p.been), [known]);
  const wants = useMemo(() => known.filter((p) => p.saved), [known]);
  const top = useMemo(() => {
    const picked = (page?.member.top ?? []).filter((id) => spotById[id]);
    if (picked.length) return { picked: true, ids: picked };
    return { picked: false, ids: [...rated].filter((p) => placeScore(p) >= 4).sort((a, b) => placeScore(b) - placeScore(a) || (b.been ?? "").localeCompare(a.been ?? "")).slice(0, 4).map((p) => p.spotId) };
  }, [page, rated, spotById]);

  const shown = useMemo(() => {
    const base = tab === "want" ? wants : rated;
    const out = base.filter((p) => {
      const s = spotById[p.spotId];
      if (tab === "places" && show === "loved" && !(p.verdict === "loved" || (p.rating ?? 0) >= 5)) return false;
      if (tab === "places" && show === "reviewed" && !p.reviewId) return false;
      if (kind !== "all" && !s.genres.includes(kind)) return false;
      if (town !== "all" && !locationsOf(s).some((l) => areaTown(l.area) === town)) return false;
      if (notMine && been[p.spotId]) return false;
      return true;
    });
    const name = (p: MemberPlace) => spotById[p.spotId].name;
    out.sort((a, b) =>
      sort === "az"
        ? name(a).localeCompare(name(b))
        : sort === "recent"
          ? (tab === "want" ? (b.savedOn ?? "").localeCompare(a.savedOn ?? "") : (b.been ?? "").localeCompare(a.been ?? ""))
          : // unrated places sort last
            placeScore(b) - placeScore(a) || (b.been ?? "").localeCompare(a.been ?? "")
    );
    return out;
  }, [tab, rated, wants, show, kind, town, sort, notMine, been, spotById]);

  // the map lights up what the list shows
  useEffect(() => {
    if (!page || !page.visible || tab === "reviews") return onPins(null);
    onPins(shown.length ? { ids: shown.map((p) => p.spotId), title: `${page.member.name}'s ${tab === "want" ? "want-to-go list" : "places"}`, sub: `${shown.length} place${shown.length === 1 ? "" : "s"}` } : null);
  }, [shown, page, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onPins(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  // what they could be treated to: their Top 4, what they want to try, what they loved
  const giftable = useMemo(() => {
    const order = [...top.ids, ...wants.map((p) => p.spotId), ...[...rated].sort((a, b) => placeScore(b) - placeScore(a)).map((p) => p.spotId)];
    return Array.from(new Set(order)).filter((id) => spotById[id] && giftFor(spotById[id]));
  }, [top, wants, rated, spotById]);

  if (page === undefined)
    return (
      <div className="member">
        <div className="skeleton-list">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  if (page === null)
    return (
      <div className="member">
        {onBack && <BackBar onBack={onBack} />}
        <div className="profile-empty">
          <h2 className="modal-title">No one here</h2>
          <p className="muted">There&apos;s no member at @{handle}. They may have changed their @name, or the account is gone.</p>
        </div>
      </div>
    );

  const m = page.member;
  const rel = page.rel;
  const friends = rel?.following === "accepted" && rel.followsMe;
  const first = m.name.split(" ")[0];
  const reason = (id: string) =>
    top.picked && top.ids.includes(id) ? `In ${first}'s Top 4` : wants.some((p) => p.spotId === id) ? `${first} wants to go` : (() => {
      const p = rated.find((x) => x.spotId === id);
      return p?.rating ? `${first} gave it ${p.rating}` : p?.verdict ? `${first}: ${VERDICT_WORDS[p.verdict].toLowerCase()}` : "";
    })();

  async function act(what: "mute" | "unmute" | "block" | "unblock" | "remove" | "copy" | string) {
    setMenu(false);
    try {
      if (what === "copy") {
        await navigator.clipboard.writeText(`${location.origin}${profilePath(m.handle)}`);
        return toast("Link copied.", "ok");
      }
      if (what === "mute" || what === "unmute") {
        await backend.mute(m.id, what === "mute");
        toast(what === "mute" ? `Muted. ${m.name} won't show in your feed, and won't know.` : "Unmuted.");
      } else if (what === "block" || what === "unblock") {
        await backend.block(m.id, what === "block");
        toast(what === "block" ? `Blocked. You won't see each other anywhere on the site.` : "Unblocked.");
      } else if (what === "remove") {
        await backend.removeFollower(m.id);
        toast(`${m.name} doesn't follow you anymore. They won't be told.`);
      } else if (what.startsWith("report:")) {
        await backend.reportMember(m.id, what.slice(7));
        return toast("Thanks. A person will look at it.", "ok");
      }
      setReload((n) => n + 1);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't do that.", "err");
    }
  }

  return (
    <div className="member">
      {onBack && <BackBar onBack={onBack} />}
      <header className="mb-head">
        <Avatar m={m} size={68} />
        <div className="mb-id">
          <h1 className="mb-name">
            {m.name}
            {m.role === "editor" && <span className="editor-tick">Local editor</span>}
          </h1>
          <p className="mb-handle">
            @{m.handle}
            {m.private && <span className="mb-lock"> · approves followers</span>}
            {friends ? <span className="mb-rel"> · Friends</span> : rel?.followsMe ? <span className="mb-rel"> · Follows you</span> : null}
          </p>
          {m.bio && <p className="mb-bio">{m.bio}</p>}
        </div>
        <div className="mb-actions">
          {mineToo ? (
            <button type="button" className="btn btn-line btn-sm" onClick={() => setEditing(true)}>
              Edit profile
            </button>
          ) : rel?.blocked ? (
            <button type="button" className="btn btn-line btn-sm" onClick={() => act("unblock")}>
              Unblock
            </button>
          ) : (
            <FollowButton person={{ id: m.id, name: m.name, private: m.private, iFollow: rel?.following ?? "none", followsMe: !!rel?.followsMe }} onChange={() => setReload((n) => n + 1)} />
          )}
          <div className="mb-more">
            <button type="button" className="mb-dots" aria-label="More" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
              ···
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div className="user-menu mb-menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                  <button className="menu-item" onClick={() => act("copy")}>
                    Copy link to this page
                  </button>
                  {rel && !rel.blocked && (
                    <>
                      {rel.followsMe && (
                        <button className="menu-item" onClick={() => act("remove")}>
                          Remove as a follower
                        </button>
                      )}
                      <button className="menu-item" onClick={() => act(rel.muted ? "unmute" : "mute")}>
                        {rel.muted ? "Unmute" : "Mute (hide from my feed)"}
                      </button>
                      <button className="menu-item" onClick={() => act("block")}>
                        Block
                      </button>
                      <p className="menu-label">Report this account</p>
                      {MEMBER_REPORT_REASONS.map((r) => (
                        <button key={r.id} className="menu-item sub" onClick={() => act(`report:${r.id}`)}>
                          {r.label}
                        </button>
                      ))}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <p className="mb-stats">
        {page.stats.been !== null && (
          <span>
            <b>{page.stats.been}</b> been
          </span>
        )}
        <span>
          <b>{page.stats.reviews}</b> {page.stats.reviews === 1 ? "review" : "reviews"}
        </span>
        <button type="button" onClick={() => page.visible && setNet("following")} disabled={!page.visible}>
          <b>{page.stats.following}</b> following
        </button>
        <button type="button" onClick={() => page.visible && setNet("followers")} disabled={!page.visible}>
          <b>{page.stats.followers}</b> {page.stats.followers === 1 ? "follower" : "followers"}
        </button>
      </p>
      {page.match && page.match.common >= MATCH_MIN && (
        <p className="mb-match">
          You agree on <b>{page.match.agree}</b> of the {page.match.common} places you&apos;ve both been.
        </p>
      )}
      {page.match && page.match.common > 0 && page.match.common < MATCH_MIN && (
        <p className="mb-match quiet">You&apos;ve both been to {page.match.common === 1 ? "1 place" : `${page.match.common} places`}. A taste match shows at {MATCH_MIN}.</p>
      )}

      {!page.visible ? (
        <div className="mb-locked">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          <p>
            {rel?.blocked
              ? `You blocked ${first}. Unblock to see their page.`
              : rel?.following === "pending"
                ? `Request sent. Once ${first} says yes you'll see their passport, reviews and want-to-go list.`
                : `${first} approves followers. Follow to see their passport, reviews and want-to-go list. Their reviews still show on each place's page.`}
          </p>
        </div>
      ) : (
        <>
          {!mineToo && (
            <button type="button" className="btn btn-green mb-treat" onClick={() => setGift(true)}>
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
                <path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
              Treat {first} to a gift card
            </button>
          )}

          {top.ids.length > 0 && (
            <section className="mb-top" aria-label={top.picked ? "Top 4" : "Highest rated"}>
              <h2 className="fr-sub">{top.picked ? `${first}'s Top 4` : "Highest rated"}</h2>
              <div className="mb-shelf">
                {top.ids.map((id) => {
                  const s = spotById[id];
                  const p = known.find((x) => x.spotId === id);
                  return (
                    <button key={id} type="button" className="mb-fav" onClick={() => onOpen(id)}>
                      <Thumb spot={s} w={160} />
                      <b>{s.name}</b>
                      <span>{p ? <Score p={p} /> : areaLabelOf(s)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <nav className="profile-tabs mb-tabs" aria-label={`${first}'s lists`}>
            {(
              [
                ["places", "Places", rated.length],
                ["reviews", "Reviews", reviews?.length ?? page.stats.reviews],
                ["want", "Want to go", wants.length],
              ] as [Tab, string, number][]
            ).map(([k, l, n]) => (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)} aria-pressed={tab === k}>
                {l} <span>{n}</span>
              </button>
            ))}
          </nav>

          {tab !== "reviews" && (
            <div className="mb-filters">
              {tab === "places" && (
                <span className="mb-show" role="group" aria-label="Show">
                  {(
                    [
                      ["all", "All"],
                      ["loved", "Loved"],
                      ["reviewed", "Reviewed"],
                    ] as [Show, string][]
                  ).map(([k, l]) => (
                    <button key={k} type="button" className={`b-chip b-chip-sm ${show === k ? "on" : ""}`} aria-pressed={show === k} onClick={() => setShow(k)}>
                      {l}
                    </button>
                  ))}
                </span>
              )}
              <label>
                <span className="sr-only">Kind of place</span>
                <select value={kind} onChange={(e) => setKind(e.target.value as GenreId | "all")}>
                  <option value="all">Any kind</option>
                  {GENRES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Where</span>
                <select value={town} onChange={(e) => setTown(e.target.value as TownId | "all")}>
                  <option value="all">Anywhere</option>
                  {TOWNS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="rating">{tab === "want" ? "Their order" : "Highest rated"}</option>
                  <option value="recent">Most recent</option>
                  <option value="az">A to Z</option>
                </select>
              </label>
              {!mineToo && user && (
                <label className="mb-check">
                  <input type="checkbox" checked={notMine} onChange={(e) => setNotMine(e.target.checked)} /> Only ones I haven&apos;t been
                </label>
              )}
            </div>
          )}

          {tab === "reviews" ? (
            reviews === null ? (
              <div className="skeleton-list">
                <span />
              </div>
            ) : reviews.length === 0 ? (
              <p className="p-empty">No reviews yet.</p>
            ) : (
              <ul className="feed">
                {reviews
                  .filter((r) => spotById[r.spotId])
                  .map((r) => (
                    <FeedReviewCard
                      key={r.id}
                      actor={m}
                      at={r.createdAt}
                      r={r}
                      spot={spotById[r.spotId]}
                      onOpen={onOpen}
                      onReview={(x) => setReviews((cur) => (cur ?? []).map((y) => (y.id === x.id ? x : y)))}
                      plain
                    />
                  ))}
              </ul>
            )
          ) : places === null ? (
            <div className="skeleton-list">
              <span />
              <span />
            </div>
          ) : shown.length === 0 ? (
            <p className="p-empty">{(tab === "want" ? wants : rated).length ? "Nothing matches those filters." : tab === "want" ? "Nothing on the list yet." : "No places yet."}</p>
          ) : (
            <ul className="mb-list">
              {shown.map((p) => {
                const s = spotById[p.spotId];
                const mine = been[p.spotId];
                const g = giftFor(s);
                return (
                  <li key={p.spotId}>
                    <button type="button" className="mb-row" onClick={() => onOpen(p.spotId)}>
                      <Thumb spot={s} w={56} />
                      <span className="mb-row-main">
                        <b>{s.name}</b>
                        <span className="mb-row-sub">
                          {GENRE_BY_ID[s.genres[0]]?.label} · {areaLabelOf(s)} · {priceLabel(s.price)}
                        </span>
                        <span className="mb-row-score">
                          {tab === "want" ? <span className="mb-want">Wants to go</span> : <Score p={p} />}
                          {!mineToo && user && (
                            <span className="mb-you">
                              You: {mine ? (mine.verdict ? VERDICT_WORDS[mine.verdict] : "been") : saved.includes(p.spotId) ? "want to go" : "not yet"}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                    {g && !mineToo && (
                      <button type="button" className="textbtn mb-gift" onClick={() => setGift(true)} aria-label={`Gift card to ${s.name}`}>
                        Gift
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <NetworkSheet open={!!net} which={net} memberId={m.id} name={first} onClose={() => setNet(null)} />
      <GiftSheet
        open={gift}
        onClose={() => setGift(false)}
        to={{ id: m.id, name: m.name, friends: !!friends }}
        spots={(giftable.length ? giftable : top.ids).map((id) => spotById[id]).filter(Boolean)}
        reason={reason}
        surface="profile"
      />
      {mineToo && <ProfileSettings open={editing} onClose={() => (setEditing(false), setReload((n) => n + 1))} spotById={spotById} />}
    </div>
  );
}

const BackBar = ({ onBack }: { onBack: () => void }) => (
  <div className="detail-bar">
    <button className="textbtn" onClick={onBack}>
      ← Back
    </button>
  </div>
);

/** their score: the review's stars, or how the visit went */
function Score({ p }: { p: MemberPlace }) {
  if (p.rating)
    return (
      <span className="mb-score">
        <Stars value={p.rating} size={12} /> {RATING_WORDS[p.rating]?.short}
      </span>
    );
  if (p.verdict) return <span className={`mb-score v-${p.verdict}`}>{VERDICT_WORDS[p.verdict]}</span>;
  return <span className="mb-score quiet">Been</span>;
}

const areaTown = (area: string): TownId | undefined => AREA_BY_ID[area]?.town;

function NetworkSheet({ open, which, memberId, name, onClose }: { open: boolean; which: null | "following" | "followers"; memberId: string; name: string; onClose: () => void }) {
  const { backend } = useApp();
  const [list, setList] = useState<Person[] | null>(null);
  const last = useRef(which);
  if (which) last.current = which;
  useEffect(() => {
    if (!open || !which) return;
    setList(null);
    backend.network(memberId, which).then(setList, () => setList([]));
  }, [open, which, memberId, backend]);
  const w = last.current;
  return (
    <Portal>
      <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="modal where"
            role="dialog"
            aria-modal="true"
            aria-label={w === "following" ? `${name} follows` : `${name}'s followers`}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="sheet-head">
              <h2 className="modal-title">{w === "following" ? `${name} follows` : `Following ${name}`}</h2>
              <button className="modal-x" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            <div className="sheet-body">
              {list === null ? (
                <div className="skeleton-list">
                  <span />
                </div>
              ) : list.length === 0 ? (
                <p className="p-empty">No one yet.</p>
              ) : (
                <ul className="people">
                  {list.map((p) => (
                    <PersonRow key={p.id} p={p} />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </Portal>
  );
}
