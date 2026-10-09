"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { areaLabelOf, priceLabel, type Spot } from "@/lib/data";
import type { Photo, Review, Submission } from "@/lib/backend";
import { useApp } from "./Providers";
import { Stars } from "./Stars";

type Tab = "reviews" | "photos" | "added" | "saved";

/** "You": a member's reviews, photos, places they've written in, and saved places. */
export default function Profile({
  spotById,
  onOpen,
  onAdd,
  admin,
  refreshKey = 0,
}: {
  refreshKey?: number;
  spotById: Record<string, Spot>;
  onOpen: (id: string) => void;
  onAdd: () => void;
  admin: boolean;
}) {
  const { backend, user, openAuth, saved, toast } = useApp();
  const [tab, setTab] = useState<Tab>("reviews");
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    backend.myReviews().then(setReviews).catch(() => setReviews([]));
    backend.myPhotos().then(setPhotos).catch(() => setPhotos([]));
    backend.mySubmissions().then(setSubs).catch(() => setSubs([]));
  }, [user, backend, refreshKey]);

  if (!user)
    return (
      <div className="profile">
        <div className="profile-empty">
          <h2 className="modal-title">Your page</h2>
          <p className="muted">Sign in to keep your reviews, photos, saved places and the places you&apos;ve added in one spot.</p>
          <button className="btn btn-green" onClick={() => openAuth("Sign in to see your page.")}>
            Sign in or make an account
          </button>
          {saved.length > 0 && (
            <>
              <h3 className="small-head" style={{ marginTop: 26 }}>
                Saved on this phone
              </h3>
              <SpotLines ids={saved} spotById={spotById} onOpen={onOpen} />
            </>
          )}
        </div>
      </div>
    );

  const counts: Record<Tab, number> = {
    reviews: reviews?.length ?? 0,
    photos: photos?.length ?? 0,
    added: subs?.length ?? 0,
    saved: saved.length,
  };
  const verified = subs?.filter((x) => x.status === "approved").length ?? 0;

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    try {
      await backend.updateName(name);
      setEditing(false);
      toast("Name updated.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't update", "err");
    }
  }

  return (
    <div className="profile">
      <header className="profile-head">
        <span className="cap-kicker">Member</span>
        {editing ? (
          <form className="name-edit" onSubmit={saveName}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus aria-label="Your name" />
            <button className="textbtn">Save</button>
            <button type="button" className="textbtn" onClick={() => (setEditing(false), setName(user.name))}>
              Cancel
            </button>
          </form>
        ) : (
          <h1 className="profile-name">
            {user.name}{" "}
            <button className="textbtn" onClick={() => setEditing(true)}>
              edit
            </button>
          </h1>
        )}
        <p className="profile-sub">
          {user.email}
          {verified > 0 && ` · ${verified} place${verified === 1 ? "" : "s"} you added ${verified === 1 ? "is" : "are"} on the map`}
        </p>
      </header>

      <nav className="profile-tabs" aria-label="Your things">
        {(
          [
            ["reviews", "Reviews"],
            ["photos", "Photos"],
            ["added", "Added"],
            ["saved", "Saved"],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)} aria-pressed={tab === k}>
            {l} <span>{counts[k]}</span>
          </button>
        ))}
      </nav>

      <motion.section key={tab} className="profile-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {tab === "reviews" &&
          (reviews === null ? (
            <Loading />
          ) : reviews.length === 0 ? (
            <Empty text="You haven't written anything up yet. Open a place you've been and tap Write one." />
          ) : (
            <ul className="p-reviews">
              {reviews.map((r) => {
                const s = spotById[r.spotId];
                return (
                  <li key={r.id}>
                    <button className="p-place" onClick={() => onOpen(r.spotId)}>
                      {s?.name ?? "A place"}
                    </button>
                    <div className="r-sig">
                      <Stars value={r.rating} size={12} />
                      <span className="r-date">{new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <p className="r-body">{r.body}</p>
                  </li>
                );
              })}
            </ul>
          ))}

        {tab === "photos" &&
          (photos === null ? (
            <Loading />
          ) : photos.length === 0 ? (
            <Empty text="No photos yet. Snap the front of a place or what you ordered and add it from that place's page." />
          ) : (
            <div className="p-photos">
              {photos.map((p) => (
                <button key={p.id} className="snap snap-sm" onClick={() => onOpen(p.spotId)}>
                  <span className="snap-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Your photo at ${spotById[p.spotId]?.name ?? "a place"}`} loading="lazy" />
                  </span>
                  <span className="snap-cap">{spotById[p.spotId]?.name ?? ""}</span>
                </button>
              ))}
            </div>
          ))}

        {tab === "added" &&
          (subs === null ? (
            <Loading />
          ) : (
            <>
              {subs.length === 0 ? (
                <Empty text="Know a place that should be on here? Write it in. We check it's real and locally owned, then it goes up with your name on it." />
              ) : (
                <ul className="sub-list">
                  {subs.map((s) => (
                    <li key={s.id} className={s.status}>
                      <span className="sub-main">
                        <strong>{s.name}</strong>
                        <span className="mono-sm">
                          {s.areaLabel} · sent {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                        {s.status === "rejected" && s.rejectReason && <span className="sub-reason">Didn&apos;t make it: {s.rejectReason}</span>}
                      </span>
                      {s.status === "approved" && s.spotId ? (
                        <button className="textbtn" onClick={() => onOpen(s.spotId!)}>
                          See it
                        </button>
                      ) : (
                        <span className="sub-pill">{s.status === "pending" ? "Being checked" : "Declined"}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <button className="btn btn-green btn-block" style={{ marginTop: 16 }} onClick={onAdd}>
                Add a place
              </button>
            </>
          ))}

        {tab === "saved" &&
          (saved.length === 0 ? (
            <Empty text="Tap Save on any place and it shows up here." />
          ) : (
            <SpotLines ids={saved} spotById={spotById} onOpen={onOpen} />
          ))}
      </motion.section>

      <footer className="profile-foot">
        {admin && (
          <Link href="/admin" className="textbtn">
            Verification desk
          </Link>
        )}
        <button
          className="textbtn"
          onClick={() => {
            backend.signOut();
            toast("Signed out.");
          }}
        >
          Sign out
        </button>
      </footer>
    </div>
  );
}

function SpotLines({ ids, spotById, onOpen }: { ids: string[]; spotById: Record<string, Spot>; onOpen: (id: string) => void }) {
  const list = ids.map((id) => spotById[id]).filter(Boolean);
  if (!list.length) return <Empty text="Your saved places are in another city." />;
  return (
    <ul className="p-saved">
      {list.map((s) => (
        <li key={s.id}>
          <button onClick={() => onOpen(s.id)}>
            <span className="nb-name">{s.name}</span>
            <span className="leader" aria-hidden />
            <span className="nb-d">
              {areaLabelOf(s)} · {priceLabel(s.price)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const Loading = () => (
  <div className="skeleton-list">
    <span />
    <span />
  </div>
);
const Empty = ({ text }: { text: string }) => <p className="p-empty">{text}</p>;
