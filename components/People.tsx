"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { feel } from "@/lib/native";
import { badgesFor, type Badge } from "@/lib/badges";
import type { Backend } from "@/lib/backend";
import { initials, profilePath, toneFor, type BadgeFacts, type FollowState, type MemberLite, type Person } from "@/lib/social";
import { useApp } from "./Providers";

/** a member's picture, or their initials on their own color */
export function Avatar({ m, size = 32 }: { m: Pick<MemberLite, "id" | "name" | "avatar">; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (m.avatar && !broken)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="av av-img" src={m.avatar} alt="" width={size} height={size} style={{ width: size, height: size }} loading="lazy" decoding="async" onError={() => setBroken(true)} />
    );
  return (
    <span className="av" style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: toneFor(m.id) }} aria-hidden>
      {initials(m.name)}
    </span>
  );
}

/* The facts behind people's marks, fetched in batches as names appear on screen and kept for the visit. */
const facts = new Map<string, BadgeFacts | null>();
const waiting = new Set<string>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
function want(ids: string[], backend: Backend) {
  ids.forEach((id) => id && !facts.has(id) && waiting.add(id));
  if (!waiting.size || timer) return;
  timer = setTimeout(async () => {
    const batch = Array.from(waiting).slice(0, 60);
    batch.forEach((id) => waiting.delete(id));
    timer = null;
    const got = await backend.memberBadges(batch).catch(() => [] as BadgeFacts[]);
    batch.forEach((id) => facts.set(id, got.find((g) => g.id === id) ?? null));
    listeners.forEach((l) => l());
    if (waiting.size) want([], backend);
  }, 40);
}
/** one member's marks (verified, credibility, Patron…), loaded with everyone else's on the screen */
export function useBadges(m: Pick<MemberLite, "id" | "role"> | null | undefined, extra?: { owner?: boolean; topRank?: number }): Badge[] {
  const { backend } = useApp();
  const [, bump] = useState(0);
  const id = m?.id;
  useEffect(() => {
    if (!id) return;
    const on = () => bump((n) => n + 1);
    listeners.add(on);
    want([id], backend);
    return () => {
      listeners.delete(on);
    };
  }, [id, backend]);
  const f = id ? facts.get(id) : null;
  return badgesFor({ ...(f ?? {}), role: m?.role, ...extra });
}
/** forget what we know about someone (after they change, say, their picture) */
export const forgetBadges = (id: string) => facts.delete(id);

/** the check next to a verified name */
export function VerifiedMark({ size = 14 }: { size?: number }) {
  return (
    <svg className="vmark" viewBox="0 0 24 24" width={size} height={size} role="img" aria-label="Verified">
      <path d="M12 2.5l2.4 1.8 3-.2 1 2.8 2.5 1.7-.9 2.9.9 2.9-2.5 1.7-1 2.8-3-.2L12 21.5l-2.4-1.8-3 .2-1-2.8-2.5-1.7.9-2.9-.9-2.9 2.5-1.7 1-2.8 3 .2z" fill="currentColor" />
      <path d="M8.3 12.2l2.4 2.4 5-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** the marks as small labels (profile header) or just the check and one word (lists) */
export function Badges({ list, compact }: { list: Badge[]; compact?: boolean }) {
  if (!list.length) return null;
  const shown = compact ? list.filter((b) => b.id !== "founding" && b.id !== "patron").slice(0, 1) : list;
  return (
    <span className={`badges ${compact ? "compact" : ""}`}>
      {shown.map((b) =>
        b.id === "verified" ? (
          <span key={b.id} className="badge badge-verified" title={b.title}>
            <VerifiedMark size={compact ? 14 : 15} />
            {!compact && b.label}
          </span>
        ) : (
          <span key={b.id} className={`badge badge-${b.id}`} title={b.title}>
            {b.label}
          </span>
        )
      )}
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
      <NameMark m={m} />
    </a>
  );
}

/** the check after a name in reviews and the feed (only Verified and editors; the rest live on their page) */
function NameMark({ m }: { m: MemberLite }) {
  const list = useBadges(m);
  if (list.some((b) => b.id === "verified")) return <VerifiedMark size={14} />;
  if (m.role === "editor") return <span className="editor-tick" title="Local editor">Editor</span>;
  return null;
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
      if (on) feel();
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
export function PersonRow({ p, onChange, note }: { p: Person; onChange?: (s: FollowState) => void; note?: string }) {
  const mark = useBadges(p).find((b) => b.id !== "verified" && b.id !== "founding" && b.id !== "editor");
  const why = note ?? p.reason ?? (p.followsMe ? "Follows you" : p.reviews ? `${p.reviews} review${p.reviews === 1 ? "" : "s"}` : p.bio);
  return (
    <li className="person">
      <Avatar m={p} size={44} />
      <span className="person-main">
        <NameLink m={p} className="person-name" />
        <span className="person-sub">
          @{p.handle}
          {mark && <span className={`badge-word badge-${mark.id}`}> · {mark.label}</span>}
          {p.private && <span className="lock" title="Approves followers"> · private</span>}
          {why && <> · {why}</>}
        </span>
      </span>
      <FollowButton person={p} onChange={onChange} small />
    </li>
  );
}
