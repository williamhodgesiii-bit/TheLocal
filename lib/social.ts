import type { Verdict } from "./backend";

/**
 * Friends: the rules and the arithmetic, in one place (README → Friends has the research).
 *
 * - Follow is one-way, like Letterboxd: following someone public is instant; a private member
 *   approves each follower. People who follow each other are "Friends".
 * - The feed is what people did (reviewed, went, want to go, followed), newest first, never
 *   ranked. Repeated lines from one person are folded together so a busy day doesn't flood it.
 * - Three labeled reactions instead of free emoji: Helpful (the one that sorts reviews), Want to
 *   go (also saves the place) and Thanks. One level of replies, 500 characters, 15 minutes to edit.
 * - Blocking hides two people from each other everywhere. Muting is quiet and one-way.
 */

export type Reaction = "helpful" | "want" | "thanks";
export const REACTIONS: { id: Reaction; label: string; mine: string; note: string }[] = [
  { id: "helpful", label: "Helpful", mine: "Helpful", note: "found your review helpful" },
  { id: "want", label: "Want to go", mine: "Saved", note: "want to go after your review" },
  { id: "thanks", label: "Thanks", mine: "Thanked", note: "said thanks for your review" },
];
export const REACTION_BY_ID = Object.fromEntries(REACTIONS.map((r) => [r.id, r])) as Record<Reaction, (typeof REACTIONS)[number]>;

export const COMMENT_MAX = 500;
export const EDIT_MINUTES = 15;
export const BIO_MAX = 160;
export const TOP_MAX = 4;
/** taste match shows once two people share this many places */
export const MATCH_MIN = 5;

export type FollowState = "none" | "pending" | "accepted";
export type CommentPolicy = "anyone" | "following" | "off";
export const COMMENT_POLICIES: { id: CommentPolicy; label: string }[] = [
  { id: "anyone", label: "Anyone signed in" },
  { id: "following", label: "People I follow" },
  { id: "off", label: "No one" },
];

export type MemberLite = { id: string; handle: string; name: string; avatar?: string; role?: "member" | "editor" };
export type Member = MemberLite & { bio?: string; private: boolean; top: string[]; since?: string; comments?: CommentPolicy };
/** your own member settings */
export type MemberSettings = {
  handle: string;
  bio: string;
  private: boolean;
  inSearch: boolean;
  shareVisits: boolean;
  shareSaved: boolean;
  comments: CommentPolicy;
  top: string[];
  /** can change the @name now (the one we picked can change right away, then once a month) */
  handleChangedAt?: string;
};
export type Me = Member & MemberSettings;
export type Rel = { following: FollowState; followsMe: boolean; muted: boolean; blocked: boolean };
export type MemberPage = {
  member: Member;
  /** their passport, lists and activity are open to me */
  visible: boolean;
  stats: { following: number; followers: number; reviews: number; been: number | null };
  /** null when it's my own page or I'm signed out */
  rel: Rel | null;
  match: { common: number; agree: number } | null;
};
/** one place on someone's page */
export type MemberPlace = { spotId: string; verdict?: Verdict; rating?: number; reviewId?: string; been?: string; saved: boolean; savedOn?: string };
/** a person in a list: search, suggestions, followers */
export type Person = MemberLite & { private: boolean; bio?: string; iFollow: FollowState; followsMe: boolean; reviews?: number; reason?: string };
export type ActivityKind = "review" | "been" | "save" | "follow";
export type Activity = { id: number; kind: ActivityKind; spotId?: string; reviewId?: string; verdict?: Verdict; at: string; actor: MemberLite; target?: MemberLite };
export type Comment = {
  id: string;
  reviewId: string;
  parentId?: string;
  user: MemberLite;
  /** null once deleted (kept as a placeholder when it has replies) */
  body: string | null;
  status: "live" | "hidden" | "held" | "removed" | "deleted";
  createdAt: string;
  editedAt?: string;
};
export type NoteKind = "follow" | "request" | "accepted" | "comment" | "reply" | "mention" | "reaction" | "gift";
export type Note = { id: number; kind: NoteKind; actor?: MemberLite; reviewId?: string; commentId?: string; spotId?: string; detail?: string; at: string; read: boolean };
export type FriendAt = { member: MemberLite; spotId: string; rating?: number; verdict?: Verdict; reviewId?: string; saved: boolean };

export const COMMENT_REPORT_REASONS: { id: string; label: string }[] = [
  { id: "abusive", label: "Abusive or hateful" },
  { id: "harassment", label: "Picking on someone" },
  { id: "personal-info", label: "Shares someone's private info" },
  { id: "spam", label: "Spam or an ad" },
  { id: "other", label: "Something else" },
];
export const MEMBER_REPORT_REASONS: { id: string; label: string }[] = [
  { id: "impersonation", label: "Pretending to be someone" },
  { id: "harassment", label: "Harassing people" },
  { id: "spam", label: "Spam or fake reviews" },
  { id: "underage", label: "Under 13" },
  { id: "inappropriate", label: "Inappropriate name or bio" },
  { id: "other", label: "Something else" },
];

/* ---------------------------------------------------------------- @names */

export const HANDLE_RE = /^[a-z][a-z0-9_]{2,19}$/;
/** what someone types, made into an @name: lowercase, no spaces or symbols */
export const cleanHandle = (s: string) => s.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "").slice(0, 20);
export function handleProblem(h: string): string | null {
  if (h.length < 3) return "At least 3 characters.";
  if (!/^[a-z]/.test(h)) return "Start with a letter.";
  if (!HANDLE_RE.test(h)) return "Letters, numbers and underscores only.";
  return null;
}
/** the @name we'd pick from a name (the database does the same, plus a number when it's taken) */
export function handleFrom(name: string) {
  // "Will Hodges" and "Will H." both make "willh": a surname never goes into an @name
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) name = parts[0] + parts[parts.length - 1][0];
  let base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14);
  if (!/^[a-z]/.test(base)) base = "eats" + base;
  if (base.length < 3) base += "eats";
  return base.slice(0, 14);
}
export const profilePath = (handle: string) => `/u/${handle}`;

/* ---------------------------------------------------------------- avatars */

export function initials(name: string) {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
/** the same calm color for the same person, from the site's palette */
const TONES = ["#2c5a43", "#b23a24", "#26408b", "#8a5a12", "#5b3f7a", "#1f6b6b", "#7a3b4a", "#4d5b1f"];
export function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

/* ---------------------------------------------------------------- time */

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - +new Date(iso)) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(d.getFullYear() !== new Date(now).getFullYear() ? { year: "numeric" } : {}) });
}
export const canEdit = (c: Pick<Comment, "createdAt">, now = Date.now()) => now - +new Date(c.createdAt) < EDIT_MINUTES * 60e3;

/* ---------------------------------------------------------------- scores */

export const VERDICT_SCORE: Record<Verdict, number> = { loved: 5, liked: 3.5, meh: 2 };
export const VERDICT_WORDS: Record<Verdict, string> = { loved: "Loved it", liked: "It was good", meh: "Not for me" };
/** one number per place for sorting someone's places: their review score, else how the visit went */
export const placeScore = (p: Pick<MemberPlace, "rating" | "verdict">) => p.rating ?? (p.verdict ? VERDICT_SCORE[p.verdict] : 0);

/* ---------------------------------------------------------------- the feed */

export type FeedGroup =
  | { key: string; type: "review"; item: Activity }
  | { key: string; type: "been" | "save" | "follow"; actor: MemberLite; items: Activity[]; at: string };

/**
 * Reviews stand alone. Visits, saves and follows by one person within a day fold into one line
 * ("Ana went to 3 places"), as long as nobody else's activity came in between.
 */
export function groupFeed(items: Activity[]): FeedGroup[] {
  const out: FeedGroup[] = [];
  for (const a of items) {
    if (a.kind === "review") {
      out.push({ key: `r${a.id}`, type: "review", item: a });
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.type === a.kind && last.actor.id === a.actor.id && +new Date(last.at) - +new Date(a.at) < 86400e3) {
      last.items.push(a);
      continue;
    }
    out.push({ key: `${a.kind}${a.id}`, type: a.kind, actor: a.actor, items: [a], at: a.at });
  }
  return out;
}

/** places the people you follow went to or reviewed lately, most people first */
export function popularWithFriends(items: Activity[], days = 60, now = Date.now()) {
  const by = new Map<string, Set<string>>();
  for (const a of items) {
    if (!a.spotId || (a.kind !== "review" && a.kind !== "been") || now - +new Date(a.at) > days * 86400e3) continue;
    if (a.kind === "been" && a.verdict === "meh") continue;
    by.set(a.spotId, (by.get(a.spotId) ?? new Set()).add(a.actor.id));
  }
  return [...by.entries()]
    .map(([spotId, who]) => ({ spotId, people: who.size }))
    .filter((x) => x.people >= 2)
    .sort((a, b) => b.people - a.people)
    .slice(0, 8);
}

/* ---------------------------------------------------------------- notifications */

export type NoteGroup = { key: string; kind: NoteKind; actors: MemberLite[]; notes: Note[]; at: string; read: boolean };

/**
 * Reactions to the same review and new followers fold together per day
 * ("Ana and 3 others found your review helpful"); everything else stays its own line.
 */
export function groupNotes(notes: Note[]): NoteGroup[] {
  const out: NoteGroup[] = [];
  const open = new Map<string, NoteGroup>();
  for (const n of notes) {
    const day = n.at.slice(0, 10);
    const k = n.kind === "reaction" ? `reaction:${n.reviewId}:${n.detail}:${day}` : n.kind === "follow" ? `follow:${day}` : `${n.kind}:${n.id}`;
    const g = open.get(k);
    if (g) {
      if (n.actor && !g.actors.some((a) => a.id === n.actor!.id)) g.actors.push(n.actor);
      g.notes.push(n);
      g.read = g.read && n.read;
      continue;
    }
    const ng: NoteGroup = { key: k, kind: n.kind, actors: n.actor ? [n.actor] : [], notes: [n], at: n.at, read: n.read };
    open.set(k, ng);
    out.push(ng);
  }
  return out;
}

/** "Ana", "Ana and Cal", "Ana and 3 others" */
export function whoList(actors: MemberLite[]) {
  const n = actors.map((a) => a.name);
  if (n.length <= 1) return n[0] ?? "Someone";
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  return `${n[0]} and ${n.length - 1} others`;
}

/** the sentence for a notification, without the names (shown in bold before it) */
export function noteLine(g: NoteGroup, placeName?: string) {
  const at = placeName ? ` of ${placeName}` : "";
  switch (g.kind) {
    case "follow":
      return g.actors.length > 1 ? "followed you" : "followed you";
    case "request":
      return "asked to follow you";
    case "accepted":
      return "said yes: you're following them now";
    case "comment":
      return `commented on your review${at}`;
    case "reply":
      return `replied to your comment${placeName ? ` on ${placeName}` : ""}`;
    case "mention":
      return `mentioned you${placeName ? ` on ${placeName}` : ""}`;
    case "reaction":
      return (REACTION_BY_ID[g.notes[0].detail as Reaction]?.note ?? "reacted to your review").replace("your review", `your review${at}`);
    case "gift":
      return `sent you a gift card${placeName ? ` to ${placeName}` : ""}. Check your email.`;
  }
}

/* ---------------------------------------------------------------- comments */

/** a comment's text with @names linked */
export function splitMentions(body: string): { text: string; handle?: string }[] {
  const out: { text: string; handle?: string }[] = [];
  let last = 0;
  for (const m of body.matchAll(/@([A-Za-z][A-Za-z0-9_]{2,19})/g)) {
    if (m.index! > last) out.push({ text: body.slice(last, m.index) });
    out.push({ text: m[0], handle: m[1].toLowerCase() });
    last = m.index! + m[0].length;
  }
  if (last < body.length) out.push({ text: body.slice(last) });
  return out;
}
/** one paragraph, like reviews */
export const tidyComment = (s: string) => s.replace(/\s+/g, " ").trimStart();

/** top-level comments, oldest first, each with its replies */
export function threadOf(list: Comment[]) {
  const tops = list.filter((c) => !c.parentId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const kids = new Map<string, Comment[]>();
  for (const c of list) if (c.parentId) kids.set(c.parentId, [...(kids.get(c.parentId) ?? []), c]);
  return tops.map((c) => ({ c, replies: (kids.get(c.id) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }));
}
