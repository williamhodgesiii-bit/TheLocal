"use client";

import { useState } from "react";
import type { Area, Spot } from "@/lib/data";
import { useApp } from "./Providers";
import { Avatar } from "./People";
import Passport from "./Passport";
import Profile from "./Profile";

type Tab = "passport" | "posts" | "settings";

/** You: one header, your numbers, then Passport · Reviews & photos · Settings. */
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
}) {
  const { user, me, been, saved, lists } = useApp();
  const [tab, setTab] = useState<Tab>("passport");
  // signed out: the profile shows the way in
  if (!user) return <Profile spotById={spotById} onOpen={onOpen} onAdd={onAdd} admin={admin} refreshKey={refreshKey} />;
  const beenCount = spots.filter((s) => been[s.id]).length;
  return (
    <div className="you">
      <header className="you-head">
        <Avatar m={{ id: user.id, name: user.name }} size={72} />
        <div className="you-id">
          <h1 className="you-name">{user.name}</h1>
          {me && <p className="you-handle">@{me.handle}</p>}
          <div className="you-btns">
            <button type="button" className="btn btn-line btn-sm" onClick={() => setTab("settings")}>
              Edit profile
            </button>
            {me && (
              <button type="button" className="btn btn-line btn-sm" onClick={() => onMember(me.handle)}>
                Public page
              </button>
            )}
          </div>
        </div>
      </header>

      <dl className="stats">
        <button type="button" onClick={() => setTab("passport")}>
          <dt>Been</dt>
          <dd>{beenCount}</dd>
        </button>
        <button type="button" onClick={onLists}>
          <dt>Want to try</dt>
          <dd>{saved.length}</dd>
        </button>
        <button type="button" onClick={onLists}>
          <dt>Lists</dt>
          <dd>{lists.length}</dd>
        </button>
      </dl>

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
        {tab === "settings" && <Profile section="settings" spotById={spotById} onOpen={onOpen} onAdd={onAdd} admin={admin} refreshKey={refreshKey} />}
      </div>
    </div>
  );
}
