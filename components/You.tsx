"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { nextBadge } from "@/lib/badges";
import type { Area, Spot } from "@/lib/data";
import type { MemberPage } from "@/lib/social";
import { useApp } from "./Providers";
import { Avatar, Badges, forgetBadges, useBadges } from "./People";
import Passport from "./Passport";
import Profile from "./Profile";
import Upgrades from "./Upgrades";
import { Icon } from "./Icons";

type Tab = "passport" | "posts" | "settings";

/** You: your picture, your marks and numbers, then Passport · Reviews & photos · Settings. */
export default function You({
  spots,
  spotById,
  areas,
  city,
  admin,
  refreshKey,
  onOpen,
  onAdd,
  onStampMany,
  onMember,
  onLists,
  onPeople,
}: {
  spots: Spot[];
  spotById: Record<string, Spot>;
  areas: Area[];
  city: string;
  admin: boolean;
  refreshKey: number;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onStampMany: () => void;
  onMember: (handle: string) => void;
  onLists: () => void;
  onPeople: () => void;
}) {
  const { user, me, setMe, been, backend, toast } = useApp();
  const [tab, setTab] = useState<Tab>("passport");
  const [page, setPage] = useState<MemberPage | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const marks = useBadges(me ?? (user ? { id: user.id } : null));

  useEffect(() => {
    if (!me) return;
    let live = true;
    backend.memberPage(me.handle).then((p) => live && setPage(p), () => {});
    return () => {
      live = false;
    };
  }, [me, backend, refreshKey]);

  // signed out: the profile shows the way in
  if (!user) return <Profile spotById={spotById} onOpen={onOpen} onAdd={onAdd} admin={admin} refreshKey={refreshKey} />;
  const beenCount = spots.filter((s) => been[s.id]).length;
  const stats = page?.stats;
  const goal = stats ? nextBadge({ reviews: stats.reviews, helpful: stats.helpful ?? 0 }) : null;

  async function onPhoto(f?: File) {
    if (!f || !me) return;
    setBusy(true);
    try {
      const url = await backend.uploadAvatar(f);
      setMe({ ...me, avatar: url });
      forgetBadges(me.id);
      toast("New picture's up.", "ok");
      track("avatar_added");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't upload that picture.", "err");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  return (
    <div className="you">
      <header className="you-head">
        <button type="button" className={`you-av ${busy ? "busy" : ""}`} onClick={() => file.current?.click()} aria-label={me?.avatar ? "Change your picture" : "Add a picture"} disabled={!me}>
          <Avatar m={me ?? { id: user.id, name: user.name }} size={84} />
          <span className="you-av-cam" aria-hidden>
            <Icon name="camera" size={16} />
          </span>
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        <div className="you-id">
          <h1 className="you-name">{user.name}</h1>
          {me && <p className="you-handle">@{me.handle}</p>}
          <Badges list={marks} />
        </div>
      </header>
      {me?.bio && <p className="you-bio">{me.bio}</p>}
      <div className="you-btns">
        <button type="button" className="btn btn-line btn-sm" onClick={() => setTab("settings")}>
          Edit profile
        </button>
        <button type="button" className="btn btn-line btn-sm" onClick={onPeople}>
          <Icon name="people" size={16} /> Find friends
        </button>
        {me && (
          <button type="button" className="btn btn-line btn-sm" onClick={() => onMember(me.handle)}>
            Public page
          </button>
        )}
      </div>

      <dl className="stats stats-4">
        <button type="button" onClick={() => setTab("passport")}>
          <dt>Been</dt>
          <dd>{beenCount}</dd>
        </button>
        <button type="button" onClick={() => setTab("posts")}>
          <dt>Reviews</dt>
          <dd>{stats?.reviews ?? "–"}</dd>
        </button>
        <button type="button" onClick={() => me && onMember(me.handle)}>
          <dt>Followers</dt>
          <dd>{stats?.followers ?? "–"}</dd>
        </button>
        <button type="button" onClick={() => me && onMember(me.handle)}>
          <dt>Following</dt>
          <dd>{stats?.following ?? "–"}</dd>
        </button>
      </dl>
      {goal && (
        <p className="you-goal">
          <Icon name="star" size={14} /> {goal}. Reviews with photos are what people trust.
        </p>
      )}

      <div className="you-tabs" role="tablist" aria-label="You">
        {(
          [
            ["passport", "Passport"],
            ["posts", "Reviews & photos"],
            ["settings", "Settings"],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      <div className="you-body">
        {tab === "passport" && <Passport spots={spots} areas={areas} city={city} onOpen={onOpen} onStampMany={onStampMany} compact />}
        {tab === "posts" && <Profile section="activity" spotById={spotById} onOpen={onOpen} onAdd={onAdd} admin={admin} refreshKey={refreshKey} />}
        {tab === "settings" && (
          <>
            <Profile section="settings" spotById={spotById} onOpen={onOpen} onAdd={onAdd} admin={admin} refreshKey={refreshKey} />
            <Upgrades verified={!!page?.member.verified} patron={!!page?.member.patron} />
          </>
        )}
      </div>
      <button type="button" className="link-btn you-lists" onClick={onLists}>
        Your lists <Icon name="right" size={14} />
      </button>
    </div>
  );
}
