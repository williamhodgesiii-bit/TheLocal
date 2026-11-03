"use client";

import { useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import { profilePath, type Person } from "@/lib/social";
import { shareLink } from "@/lib/native";
import { useApp } from "./Providers";
import { Avatar, Badges, FollowButton, NameLink, PersonRow, useBadges } from "./People";
import { Icon } from "./Icons";

/**
 * People: find friends and the local reviewers worth following. Search by name or @name; with
 * nothing typed, the people we'd suggest, this month's most useful reviewers, and a link to send
 * your friends.
 */
export default function PeopleView({ initialQuery = "", onMe }: { initialQuery?: string; onMe: () => void }) {
  const { backend, user, me, openAuth, toast } = useApp();
  const [q, setQ] = useState(initialQuery);
  const [hits, setHits] = useState<Person[] | null>(null);
  const [suggested, setSuggested] = useState<Person[] | null>(null);
  const [top, setTop] = useState<Person[] | null>(null);

  useEffect(() => {
    let live = true;
    backend.topReviewers(30).then((t) => live && setTop(t), () => live && setTop([]));
    backend.suggestedMembers().then((p) => live && setSuggested(p), () => live && setSuggested([]));
    return () => {
      live = false;
    };
  }, [backend, user?.id]);

  useEffect(() => {
    const t = q.trim();
    if (t.replace(/^@/, "").length < 2) return setHits(null);
    let live = true;
    const h = window.setTimeout(() => {
      backend.searchMembers(t).then((r) => live && setHits(r), () => live && setHits([]));
      track("people_search");
    }, 220);
    return () => {
      live = false;
      window.clearTimeout(h);
    };
  }, [q, backend]);

  // nobody twice: top reviewers first, then the rest of the suggestions
  const rest = useMemo(() => (suggested ?? []).filter((p) => !(top ?? []).some((t) => t.id === p.id)), [suggested, top]);

  async function invite() {
    if (!me) return openAuth("Sign in to get your own page to share. It takes a few seconds, no password.");
    const how = await shareLink({ title: `${me.name} on The Plate Next Door`, text: "Follow me on The Plate Next Door: where I eat around Birmingham.", url: `${location.origin}${profilePath(me.handle)}` });
    if (how === "copied") toast("Link copied. Send it to a friend.", "ok");
    if (how !== "dismissed") track("share_profile", { from: "people" });
  }

  return (
    <div className="people">
      <header className="page-head">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-sub">Follow friends and local reviewers. Their reviews and photos fill your feed.</p>
        </div>
      </header>

      <label className="search people-search">
        <Icon name="search" size={18} />
        <span className="sr-only">Find people</span>
        <input type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or @name" autoFocus={!!initialQuery} />
        {q && (
          <button type="button" className="search-x" onClick={() => setQ("")} aria-label="Clear search">
            <Icon name="close" size={16} />
          </button>
        )}
      </label>

      {hits !== null ? (
        <section className="ppl-sec">
          {hits.length === 0 ? (
            <p className="empty-line">Nobody by that name yet. Invite them: send your page, and they can follow you back.</p>
          ) : (
            <ul className="people-list">
              {hits.map((p) => (
                <PersonRow key={p.id} p={p} />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <button type="button" className="invite" onClick={invite}>
            <span className="invite-ico" aria-hidden>
              <Icon name="share" size={20} />
            </span>
            <span className="invite-t">
              <b>Invite friends</b>
              <span>{me ? "Send them your page. When they join, follow each other." : "Sign in to get your own page to share."}</span>
            </span>
            <Icon name="right" size={18} />
          </button>

          {top && top.length > 0 && (
            <section className="ppl-sec">
              <h2 className="sec-title">Top reviewers this month</h2>
              <p className="shelf-line">Ranked by reviews other people found helpful, with photos counting extra.</p>
              <ol className="top-list">
                {top.slice(0, 10).map((p, i) => (
                  <TopRow key={p.id} p={p} rank={i + 1} />
                ))}
              </ol>
            </section>
          )}

          {rest.length > 0 && (
            <section className="ppl-sec">
              <h2 className="sec-title">{user ? "People you might know" : "People to follow"}</h2>
              <ul className="people-list">
                {rest.map((p) => (
                  <PersonRow key={p.id} p={p} />
                ))}
              </ul>
            </section>
          )}

          {top !== null && suggested !== null && !top.length && !rest.length && (
            <div className="first-review">
              <p className="fr-big">Be one of the first.</p>
              <p>Write a review with a photo and you&apos;ll show up here for everyone looking for someone to follow.</p>
            </div>
          )}

          {user && (
            <button type="button" className="link-btn ppl-me" onClick={onMe}>
              How your page looks to others <Icon name="right" size={14} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

function TopRow({ p, rank }: { p: Person; rank: number }) {
  const list = useBadges(p, { topRank: rank }).filter((b) => b.id !== "founding");
  return (
    <li className="top-row">
      <span className="top-n">{rank}</span>
      <Avatar m={p} size={48} />
      <span className="person-main">
        <NameLink m={p} className="person-name" />
        <span className="person-sub">
          {p.reviews ?? 0} {p.reviews === 1 ? "review" : "reviews"}
          {p.photos ? ` · ${p.photos} photos` : ""}
          {p.helpful ? ` · ${p.helpful} found helpful` : ""}
        </span>
        <Badges list={list.filter((b) => b.id !== "verified").slice(0, 2)} />
      </span>
      <FollowButton person={p} small />
    </li>
  );
}
