"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { initials, profilePath, toneFor, type FollowState, type MemberLite, type Person } from "@/lib/social";
import { useApp } from "./Providers";

/** a member's initials on their own color (pictures come later) */
export function Avatar({ m, size = 32 }: { m: Pick<MemberLite, "id" | "name" | "avatar">; size?: number }) {
  return (
    <span className="av" style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: toneFor(m.id) }} aria-hidden>
      {initials(m.name)}
    </span>
  );
}

/** a name that opens their page (a real link, so it opens in a new tab too) */
export function NameLink({ m, className = "", children }: { m: MemberLite; className?: string; children?: React.ReactNode }) {
  const { nav } = useApp();
  if (!m.handle) return <span className={className}>{children ?? m.name}</span>;
  return (
    <a
      href={profilePath(m.handle)}
      className={`who ${className}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        nav.member(m.handle);
      }}
    >
      {children ?? m.name}
      {m.role === "editor" && <span className="editor-tick" title="Local editor">Editor</span>}
    </a>
  );
}

/**
 * Follow, Requested, Following. Unfollowing takes a second tap ("Unfollow?") so a stray thumb
 * doesn't do it; a request can be taken back the same way.
 */
export function FollowButton({
  person,
  onChange,
  small,
}: {
  person: Pick<Person, "id" | "name" | "private" | "iFollow" | "followsMe">;
  onChange?: (s: FollowState) => void;
  small?: boolean;
}) {
  const { backend, user, requireAuth, toast } = useApp();
  const [state, setState] = useState<FollowState>(person.iFollow);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = useRef<number>();
  useEffect(() => setState(person.iFollow), [person.iFollow, person.id]);
  useEffect(() => () => window.clearTimeout(t.current), []);
  if (user?.id === person.id) return null;

  async function go(on: boolean) {
    setBusy(true);
    try {
      const next = await backend.follow(person.id, on);
      setState(next);
      onChange?.(next);
      track(on ? "follow" : "unfollow");
      if (next === "pending") toast(`Request sent. ${person.name} approves followers.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't do that. Try again?", "err");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }
  function click() {
    if (!requireAuth(`Sign in to follow ${person.name}. It takes a few seconds, no password.`, () => go(true))) return;
    if (state === "none") return go(true);
    if (!confirm) {
      setConfirm(true);
      window.clearTimeout(t.current);
      t.current = window.setTimeout(() => setConfirm(false), 3500);
      return;
    }
    go(false);
  }
  const label =
    state === "none"
      ? person.followsMe
        ? "Follow back"
        : "Follow"
      : confirm
        ? state === "pending"
          ? "Cancel request?"
          : "Unfollow?"
        : state === "pending"
          ? "Requested"
          : person.followsMe
            ? "Friends"
            : "Following";
  return (
    <button
      type="button"
      className={`follow-btn ${state} ${confirm ? "confirm" : ""} ${small ? "sm" : ""}`}
      onClick={click}
      disabled={busy}
      aria-pressed={state !== "none"}
      aria-label={state === "none" ? `Follow ${person.name}` : `${label}: ${person.name}`}
    >
      {label}
    </button>
  );
}

/** a person in a list: picture, name, @name, why they're here, and Follow */
export function PersonRow({ p, onChange }: { p: Person; onChange?: (s: FollowState) => void }) {
  const why = p.reason ?? (p.followsMe ? "Follows you" : p.reviews ? `${p.reviews} review${p.reviews === 1 ? "" : "s"}` : p.bio);
  return (
    <li className="person">
      <Avatar m={p} size={40} />
      <span className="person-main">
        <NameLink m={p} className="person-name" />
        <span className="person-sub">
          @{p.handle}
          {p.private && <span className="lock" title="Approves followers"> · private</span>}
          {why && <> · {why}</>}
        </span>
      </span>
      <FollowButton person={p} onChange={onChange} small />
    </li>
  );
}
