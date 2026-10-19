"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Spot } from "@/lib/data";
import type { Photo, Review, Submission } from "@/lib/backend";
import { DEFAULT_CITY, homeLabel, homeParts, isOpenCity } from "@/lib/regions";
import { track } from "@/lib/analytics";
import { useApp } from "./Providers";
import HomeSelect from "./HomeSelect";
import ProfileSettings from "./ProfileSettings";
import PhotoImg from "./Photo";
import { Stars } from "./Stars";

type Tab = "reviews" | "photos" | "added";

/** "You", under the passport: a member's reviews, photos and the places they've written in. */
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
  const { backend, user, authReady, openAuth, toast, home, setHome, me, nav } = useApp();
  const [settings, setSettings] = useState(false);
  const [tab, setTab] = useState<Tab>("reviews");
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  /** the home being picked, while the picker is open */
  const [homeEdit, setHomeEdit] = useState<string | null>(null);
  const [passkeys, setPasskeys] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !backend.canUsePasskeys()) return setPasskeys(null);
    backend.passkeyCount().then(setPasskeys).catch(() => setPasskeys(0));
  }, [user, backend]);

  async function addPasskey() {
    try {
      await backend.registerPasskey();
      track("passkey_added");
      toast("Passkey saved. Next time, sign in with Face ID, your fingerprint or your device PIN.", "ok");
      setPasskeys((n) => (n ?? 0) + 1);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      if (!/abort|cancel|notallowed/i.test(`${(e as { name?: string })?.name ?? ""} ${m}`)) toast(m || "Couldn't save a passkey on this device.", "err");
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await backend.deleteAccount();
      track("account_deleted");
      toast("Your account and everything in it is deleted.", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete your account.", "err");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

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
        {authReady ? (
          <div className="profile-empty">
            <h2 className="modal-title">Your Plate Passport starts here</h2>
            <p className="muted">
              Exploring is free. Sign in to stamp your passport, save places to try, spin Surprise me, write reviews, post photos and add the places you love.
              Free, and there&apos;s no password: we email you a code.
            </p>
            <button className="btn btn-green" onClick={() => openAuth()}>
              Sign in or join
            </button>
          </div>
        ) : (
          <Loading />
        )}
      </div>
    );

  const counts: Record<Tab, number> = {
    reviews: reviews?.length ?? 0,
    photos: photos?.length ?? 0,
    added: subs?.length ?? 0,
  };
  const verified = subs?.filter((x) => x.status === "approved").length ?? 0;

  function saveHome(e: React.FormEvent) {
    e.preventDefault();
    if (!homeEdit || !user) return;
    setHome(homeEdit);
    if (!isOpenCity(homeEdit)) {
      const p = homeParts(homeEdit);
      backend.waitlist(user.email, p.state, p.city).catch(() => {});
    }
    toast(`Home set: ${homeLabel(homeEdit)}`, "ok");
    setHomeEdit(null);
  }

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
        {me && (
          <p className="profile-social">
            <a
              href={`/u/${me.handle}`}
              className="textbtn"
              onClick={(e) => {
                e.preventDefault();
                nav.member(me.handle);
              }}
            >
              @{me.handle}
            </a>
            <span aria-hidden> · </span>
            <button className="textbtn" onClick={() => setSettings(true)}>
              Edit your page &amp; privacy
            </button>
            <span aria-hidden> · </span>
            <button className="textbtn" onClick={() => nav.friends()}>
              Find friends
            </button>
            {me.private && <span className="profile-lock"> · You approve followers</span>}
          </p>
        )}
        <p className="profile-sub">
          {user.email}
          {verified > 0 && ` · ${verified} place${verified === 1 ? "" : "s"} you added ${verified === 1 ? "is" : "are"} on the map`}
        </p>
        {homeEdit === null ? (
          <p className="profile-home">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
              <path d="M4 11.5 12 5l8 6.5V20h-5.5v-5h-5v5H4Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
            </svg>
            Home: <strong>{homeLabel(home) || "not picked yet"}</strong>{" "}
            <button className="textbtn" onClick={() => setHomeEdit(home ?? DEFAULT_CITY)}>
              {home ? "change" : "pick one"}
            </button>
          </p>
        ) : (
          <form className="form profile-home-edit" onSubmit={saveHome}>
            <HomeSelect value={homeEdit} onChange={setHomeEdit} />
            <p className="pp-actions">
              <button className="btn btn-green btn-sm">Save home</button>
              <button type="button" className="textbtn" onClick={() => setHomeEdit(null)}>
                Cancel
              </button>
            </p>
          </form>
        )}
        <button className="btn btn-line profile-add" onClick={onAdd}>
          + Add a place you love
        </button>
      </header>

      <nav className="profile-tabs" aria-label="Your things">
        {(
          [
            ["reviews", "Reviews"],
            ["photos", "Photos"],
            ["added", "Added"],
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
                    <PhotoImg src={p.url} alt={`Your photo at ${spotById[p.spotId]?.name ?? "a place"}`} />
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
                <Empty text="Know a plate next door we're missing? Write it in. We check it's real and locally owned, then it goes up with your name on it." />
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

      </motion.section>

      <section className="acct" aria-label="Sign-in and privacy">
        <h2 className="acct-head">Sign-in &amp; privacy</h2>
        <p className="acct-row">
          Signed in as <strong>{user.email}</strong>. No password: we email you a code each time. Your email is never shown to other members.
        </p>
        {passkeys !== null && (
          <p className="acct-row">
            {passkeys > 0
              ? `${passkeys} passkey${passkeys === 1 ? "" : "s"} saved, so you can sign in with Face ID, your fingerprint or your device PIN.`
              : "Skip the email code: sign in with Face ID, your fingerprint or your device PIN."}{" "}
            <button className="textbtn" onClick={addPasskey}>
              {passkeys > 0 ? "Add this device" : "Set up a passkey"}
            </button>
          </p>
        )}
        <p className="acct-row">
          <Link href="/privacy" className="textbtn">
            What we keep, and why
          </Link>
          <span aria-hidden> · </span>
          <Link href="/terms" className="textbtn">
            Terms
          </Link>
          <span aria-hidden> · </span>
          <a href="mailto:emails@theplatenextdoor.com" className="textbtn">
            Contact us
          </a>
        </p>
        <p className="acct-row acct-danger">
          {confirmDelete ? (
            <>
              <span>This deletes your account, reviews, photos, passport, saved places, follows and comments for good.</span>{" "}
              <button className="textbtn danger" disabled={deleting} onClick={deleteAccount}>
                {deleting ? "Deleting…" : "Yes, delete everything"}
              </button>{" "}
              <button className="textbtn" onClick={() => setConfirmDelete(false)}>
                Keep my account
              </button>
            </>
          ) : (
            <button className="textbtn" onClick={() => setConfirmDelete(true)}>
              Delete my account
            </button>
          )}
        </p>
      </section>

      <ProfileSettings open={settings} onClose={() => setSettings(false)} spotById={spotById} />

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

const Loading = () => (
  <div className="skeleton-list">
    <span />
    <span />
  </div>
);
const Empty = ({ text }: { text: string }) => <p className="p-empty">{text}</p>;
