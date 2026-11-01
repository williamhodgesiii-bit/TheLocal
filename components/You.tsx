"use client";

import type { Area, Spot } from "@/lib/data";
import { useApp } from "./Providers";
import { Avatar } from "./People";
import Passport from "./Passport";
import Profile from "./Profile";

/** You: who you are on the site, your Plate Passport, then your reviews, photos and settings. */
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
  const beenCount = spots.filter((s) => been[s.id]).length;
  return (
    <div className="you">
      {user && (
        <header className="you-head">
          <Avatar m={{ id: user.id, name: user.name }} size={64} />
          <div className="you-id">
            <h1 className="page-title">{user.name}</h1>
            {me && <p className="you-handle">@{me.handle}</p>}
          </div>
          {me && (
            <button type="button" className="btn btn-line btn-sm" onClick={() => onMember(me.handle)}>
              Your public page
            </button>
          )}
        </header>
      )}
      {user && (
        <dl className="stats">
          <div>
            <dt>Been</dt>
            <dd>{beenCount}</dd>
          </div>
          <div>
            <dt>Want to try</dt>
            <dd>{saved.length}</dd>
          </div>
          <button type="button" onClick={onLists}>
            <dt>Lists</dt>
            <dd>{lists.length}</dd>
          </button>
        </dl>
      )}
      {user && <Passport spots={spots} areas={areas} city={city} onOpen={onOpen} onStampMany={onStampMany} />}
      <Profile spotById={spotById} onOpen={onOpen} onAdd={onAdd} admin={admin} refreshKey={refreshKey} />
    </div>
  );
}
