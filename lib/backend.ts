"use client";

import { createClient, type SupabaseClient, type User as AuthUser } from "@supabase/supabase-js";
import { resizeImage } from "./image";
import { canonicalSpotId, cleanGenres, slugify, type DrinkKind, type GenreId, type Spot } from "./data";
import { DAILY_MAX } from "./reviews";
import { BANNED_MESSAGE, hasBannedWord } from "./moderation";
import { currentPushToken, isNativeApp, nativeAuthStorage } from "./native";
import {
  VERDICT_SCORE,
  handleFrom,
  handleProblem,
  type Activity,
  type Comment,
  type CommentPolicy,
  type FollowState,
  type FriendAt,
  type Me,
  type MemberLite,
  type MemberPage,
  type MemberPlace,
  type MemberSettings,
  type Note,
  type Person,
  type Reaction,
} from "./social";
import { SUPABASE_KEY, SUPABASE_URL, hasSupabase } from "./supabase-env";

export type User = {
  id: string;
  name: string;
  email: string;
  /** home city id (or "other:Town, ST"), see lib/regions */
  home?: string;
  /** hasn't picked the name people see yet (we show a one-field welcome) */
  needsName?: boolean;
  /** full name from Google, when they signed in that way */
  fullName?: string;
  /** this is the account's first sign-in */
  isNew?: boolean;
};
/** how a visit went, Beli-style: three honest choices instead of five stars */
export type Verdict = "loved" | "liked" | "meh";
export type Stamp = { at: string; verdict?: Verdict };
/** places you've eaten at: the Plate Passport */
export type BeenMap = Record<string, Stamp>;
export type Review = {
  id: string;
  spotId: string;
  userId: string;
  userName: string;
  /** 1–5, every step labeled (lib/reviews.ts) */
  rating: number;
  /** one paragraph, 100–600 characters (older reviews may be shorter) */
  body: string;
  createdAt: string;
  updatedAt?: string;
  /** "Would you go back?" (missing on reviews from before it was asked) */
  goBack?: boolean;
  /** visit month, "2026-09" */
  visited?: string;
  /** what they got, one to three things */
  ordered?: string[];
  goodFor?: string[];
  sub?: { taste?: number; service?: number; vibe?: number };
  /** "live", or "held" while we check a reported review (only its author sees it then) */
  status?: "live" | "held" | "removed";
  helpful?: number;
  /** the signed-in member marked it helpful */
  votedHelpful?: boolean;
  /** how many reviews the writer has posted, all places */
  reviewerCount?: number;
  /** the writer's @name, for a link to their page */
  handle?: string;
  /** counts of each reaction (Helpful is also kept in `helpful`) */
  reactions?: Partial<Record<Reaction, number>>;
  /** what the signed-in member reacted with */
  myReactions?: Reaction[];
  comments?: number;
  /** who the writer lets comment */
  writerComments?: CommentPolicy;
};
export type ReviewInput = {
  rating: number;
  body: string;
  goBack: boolean;
  visited: string;
  ordered: string[];
  goodFor: string[];
  sub: { taste?: number; service?: number; vibe?: number };
};
export type PhotoKind = "food" | "building" | "vibe";
export type Photo = {
  id: string;
  spotId: string;
  userId: string;
  userName: string;
  url: string;
  kind: PhotoKind;
  caption?: string;
  createdAt: string;
};
export type RatingSummary = Record<string, { avg: number; count: number; goBack?: number | null }>;
export type SpotInput = {
  cityId: string;
  name: string;
  address: string;
  area: string;
  areaLabel: string;
  coords: [number, number];
  genres: GenreId[];
  drinks: DrinkKind[];
  price: 1 | 2 | 3 | 4;
  knownFor: string;
  blurb: string;
  website?: string;
  phone?: string;
  tags: string[];
};
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type Submission = SpotInput & {
  id: string;
  status: SubmissionStatus;
  submittedBy: string;
  submitterName: string;
  note?: string;
  photoUrl?: string;
  rejectReason?: string;
  reviewedAt?: string;
  spotId?: string;
  createdAt: string;
};
export type Checklist = Record<string, boolean>;
export type Lead = { name: string; business: string; email: string; tier: string; message?: string };

export interface Backend {
  mode: "supabase" | "local";
  getUser(): Promise<User | null>;
  onAuth(cb: (u: User | null) => void): () => void;

  /* sign-in: one flow for new and returning members, no passwords */
  /** Email a one-time code (and a link). Demo mode signs in at once and returns the user as `instant`. */
  sendCode(email: string): Promise<{ instant?: User }>;
  verifyCode(email: string, code: string): Promise<User>;
  /** Google client id when "Continue with Google" is set up */
  googleClientId: string | null;
  signInWithGoogleToken(idToken: string, nonce: string): Promise<User>;
  signInWithGoogleRedirect(next: string): Promise<void>;
  /** passkeys (Face ID, fingerprint, device PIN) are switched on and this browser supports them */
  canUsePasskeys(): boolean;
  signInWithPasskey(opts?: { conditional?: boolean; signal?: AbortSignal }): Promise<User | null>;
  registerPasskey(): Promise<void>;
  passkeyCount(): Promise<number>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;

  /* personal lists, kept in the account so they follow you to any device */
  pullLists(): Promise<{ saved: string[]; been: BeenMap }>;
  putSaved(spotId: string, on: boolean): Promise<void>;
  putStamp(spotId: string, stamp: Stamp | null): Promise<void>;
  pushLists(saved: string[], been: BeenMap): Promise<void>;

  /** a place's reviews; pass every id it has gone by (see spotIdsOf) */
  listReviews(spotIds: string | string[]): Promise<Review[]>;
  /** one per member per place: posting again replaces their review */
  addReview(spotId: string, input: ReviewInput): Promise<Review>;
  deleteReview(id: string): Promise<void>;
  voteHelpful(reviewId: string, on: boolean): Promise<void>;
  reportReview(reviewId: string, reason: string, note?: string): Promise<void>;
  listPhotos(spotId: string): Promise<Photo[]>;
  addPhoto(spotId: string, file: File, kind: PhotoKind, caption?: string): Promise<Photo>;
  ratings(): Promise<RatingSummary>;
  subscribe(email: string): Promise<void>;
  lead(l: Lead): Promise<void>;
  waitlist(email: string, state: string, city: string): Promise<void>;

  /* profile */
  myReviews(): Promise<Review[]>;
  myPhotos(): Promise<Photo[]>;
  updateName(name: string): Promise<User>;
  updateHome(home: string): Promise<User>;

  /* community spots */
  listSpots(cityId: string): Promise<Spot[]>;
  getSpot(id: string): Promise<Spot | null>;
  submitSpot(input: SpotInput, note?: string, photo?: File): Promise<Submission>;
  mySubmissions(): Promise<Submission[]>;

  /* friends (README → Friends) */
  /** my public side, made on first use; null when signed out */
  myMember(): Promise<Me | null>;
  saveMember(patch: Partial<MemberSettings>): Promise<Me>;
  handleFree(handle: string): Promise<boolean>;
  memberPage(handle: string): Promise<MemberPage | null>;
  memberPlaces(id: string): Promise<MemberPlace[]>;
  memberReviews(id: string): Promise<Review[]>;
  network(id: string, which: "following" | "followers"): Promise<Person[]>;
  follow(id: string, on: boolean): Promise<FollowState>;
  requests(): Promise<(MemberLite & { at: string })[]>;
  answerRequest(id: string, accept: boolean): Promise<void>;
  removeFollower(id: string): Promise<void>;
  block(id: string, on: boolean): Promise<void>;
  mute(id: string, on: boolean): Promise<void>;
  blocked(): Promise<MemberLite[]>;
  reportMember(id: string, reason: string, note?: string): Promise<void>;
  searchMembers(q: string): Promise<Person[]>;
  suggestedMembers(): Promise<Person[]>;
  /** newest first; pass the last item to get the next page */
  feed(scope: "following" | "everyone", before?: { at: string; id: number }): Promise<{ items: Activity[]; reviews: Record<string, Review> }>;
  /** the people I follow who've been to, reviewed or saved these places */
  friendsAt(spotIds: string[]): Promise<FriendAt[]>;
  react(reviewId: string, kind: Reaction, on: boolean): Promise<void>;
  listComments(reviewId: string): Promise<Comment[]>;
  addComment(reviewId: string, body: string, parentId?: string): Promise<Comment>;
  editComment(id: string, body: string): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
  /** the review's writer takes a comment down (or puts it back) */
  hideComment(id: string, hidden: boolean): Promise<void>;
  reportComment(id: string, reason: string): Promise<void>;
  notes(): Promise<Note[]>;
  unread(): Promise<number>;
  markRead(): Promise<void>;
  /** "I sent you a gift card": a note to a friend */
  sendGiftNote(toId: string, spotId: string, note: string): Promise<void>;
  /** the iPhone app's push address for this phone, kept with the signed-in account */
  savePushToken(token: string): Promise<void>;

  /* moderation */
  isAdmin(): Promise<boolean>;
  listSubmissions(status: SubmissionStatus): Promise<Submission[]>;
  approveSubmission(sub: Submission, edits: SpotInput & { pop: number }, checklist: Checklist): Promise<Spot>;
  rejectSubmission(id: string, reason: string): Promise<void>;
}

const newSpotId = (name: string) => `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null;
const PASSKEYS_ON = process.env.NEXT_PUBLIC_PASSKEYS === "on";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "will.hodges@…" → "Will" */
export function nameFromEmail(email: string) {
  const first = (email.split("@")[0] || "").split(/[._\-+0-9]+/).find((p) => p.length >= 2) ?? "";
  return first ? first[0].toUpperCase() + first.slice(1).toLowerCase() : "";
}
/** Ratings stored under a place's old per-location ids count toward its one listing. */
function foldAliases(rows: { id: string; avg: number; count: number; goBack: number | null }[]): RatingSummary {
  const out: RatingSummary = {};
  for (const r of rows) {
    const id = canonicalSpotId(r.id);
    const o = out[id];
    if (!o) {
      out[id] = { avg: r.avg, count: r.count, goBack: r.goBack };
      continue;
    }
    const n = o.count + r.count;
    const gb = o.goBack == null ? r.goBack : r.goBack == null ? o.goBack : (o.goBack * o.count + r.goBack * r.count) / n;
    out[id] = { avg: (o.avg * o.count + r.avg * r.count) / n, count: n, goBack: gb == null ? null : Math.round(gb) };
  }
  return out;
}

/** "Will Hodges" → "Will H.", the way reviews are signed */
export function shortName(full?: string) {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

/** Supabase's error text, said the way we'd say it. */
function friendly(e: { message?: string; code?: string; status?: number } | null): Error {
  const m = e?.message ?? "";
  if (/expired|invalid/i.test(m) && /token|otp|code/i.test(m)) return new Error("That code didn't work. Use the newest email from us, or send a new code.");
  if (/only request this after|security purposes/i.test(m)) return new Error("Give it a few seconds before asking for another code.");
  // only point to Google when the site actually offers it
  const orGoogle = GOOGLE_CLIENT_ID ? ", or continue with Google" : "";
  if (/rate limit/i.test(m)) return new Error(`We're sending a lot of codes right now. Try again in a few minutes${orGoogle}.`);
  if (/signups? not allowed/i.test(m)) return new Error("New sign-ups are paused for a moment. Try again soon.");
  // the free email plan has a daily cap; Google and passkeys don't use email at all
  if (/error sending|smtp|send.*(email|mail)|mail.*fail/i.test(m))
    return new Error(GOOGLE_CLIENT_ID ? "We couldn't send a code just now. Continue with Google instead, or try again in a little while." : "We couldn't send a code just now. Try again in a little while.");
  if (/invalid.*email|email.*invalid/i.test(m)) return new Error("That email doesn't look right.");
  return new Error(m || "Something went wrong. Try again?");
}

function spotFrom(sub: Submission, edits: SpotInput & { pop: number }, id: string, reviewedAt: string): Spot {
  return {
    id,
    city: edits.cityId,
    name: edits.name,
    genres: edits.genres,
    drinks: edits.drinks.length ? edits.drinks : undefined,
    area: edits.area,
    areaLabel: edits.areaLabel,
    address: edits.address,
    coords: edits.coords,
    price: edits.price,
    knownFor: edits.knownFor,
    blurb: edits.blurb,
    tags: edits.tags,
    pop: edits.pop,
    website: edits.website || undefined,
    phone: edits.phone || undefined,
    addedBy: sub.submitterName,
    verifiedAt: reviewedAt,
  };
}

/* ============================== SUPABASE ============================== */

function supabaseBackend(sb: SupabaseClient): Backend {
  const toUser = (u: AuthUser | null | undefined): User | null => {
    if (!u) return null;
    const m = (u.user_metadata ?? {}) as Record<string, unknown>;
    const email = u.email ?? "";
    const fullName = ((m.full_name || m.name) as string) || undefined;
    const display = (m.display_name as string) || undefined;
    return {
      id: u.id,
      email,
      name: display || shortName(fullName) || nameFromEmail(email) || "Local",
      home: (m.home_city as string) || undefined,
      needsName: !display,
      fullName,
      // a name is set on the very first sign-in (the welcome step, or from Google), so none yet means new
      isNew: !display,
    };
  };
  const callback = (next: string) => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  /** the signed-in member's id from the local session (no network round trip; RLS enforces the rest) */
  async function sessionUserId() {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error("Sign in first.");
    return id;
  }

  const mapReview = (r: Record<string, any>): Review => {
    const sub = Object.fromEntries((["taste", "service", "vibe"] as const).filter((k) => r[`sub_${k}`]).map((k) => [k, Number(r[`sub_${k}`])]));
    return {
      id: r.id, spotId: r.spot_id, userId: r.user_id, userName: r.display_name, rating: r.rating, body: r.body, createdAt: r.created_at,
      updatedAt: r.updated_at ?? undefined,
      goBack: typeof r.go_back === "boolean" ? r.go_back : undefined,
      visited: r.visited_on ? String(r.visited_on).slice(0, 7) : undefined,
      ordered: r.ordered ?? [],
      goodFor: r.good_for ?? [],
      sub: Object.keys(sub).length ? sub : undefined,
      status: r.status ?? "live",
    };
  };
  // the database before the reviews update was run on it: still take reviews, just the basics
  const oldSchema = (e: { code?: string; message?: string } | null) =>
    !!e && (e.code === "PGRST204" || e.code === "42703" || /column .* does not exist|Could not find the '.*' column/i.test(e.message ?? ""));
  const mapPhoto = (p: Record<string, any>): Photo => ({
    id: p.id, spotId: p.spot_id, userId: p.user_id, userName: p.display_name, url: p.url, kind: p.kind, caption: p.caption ?? undefined, createdAt: p.created_at,
  });

  async function requireUser() {
    const { data } = await sb.auth.getUser();
    const u = toUser(data.user);
    if (!u) throw new Error("Sign in first.");
    return u;
  }

  const mapSub = (r: Record<string, any>): Submission => ({
    id: r.id, cityId: r.city_id, name: r.name, address: r.address, area: r.area, areaLabel: r.area_label, coords: [r.lat, r.lng],
    genres: cleanGenres(r.genres), drinks: r.drinks ?? [], price: r.price, knownFor: r.known_for, blurb: r.blurb, website: r.website ?? undefined,
    phone: r.phone ?? undefined, tags: r.tags ?? [], status: r.status, submittedBy: r.submitted_by, submitterName: r.submitter_name,
    note: r.note ?? undefined, photoUrl: r.photo_url ?? undefined, rejectReason: r.reject_reason ?? undefined, reviewedAt: r.reviewed_at ?? undefined,
    spotId: r.spot_id ?? undefined, createdAt: r.created_at,
  });
  const mapSpot = (r: Record<string, any>): Spot => ({
    id: r.id, city: r.city_id, name: r.name, genres: cleanGenres(r.genres), drinks: r.drinks?.length ? r.drinks : undefined, area: r.area,
    areaLabel: r.area_label ?? undefined, address: r.address, coords: [r.lat, r.lng], price: r.price, knownFor: r.known_for, blurb: r.blurb,
    tags: r.tags ?? [], pop: r.pop ?? 60, sponsored: r.sponsored ?? false, website: r.website ?? undefined, phone: r.phone ?? undefined,
    addedBy: r.added_by ?? undefined, verifiedAt: r.verified_at ?? undefined,
  });
  const inputRow = (i: SpotInput) => ({
    city_id: i.cityId, name: i.name, address: i.address, area: i.area, area_label: i.areaLabel, lat: i.coords[0], lng: i.coords[1],
    genres: i.genres, drinks: i.drinks, price: i.price, known_for: i.knownFor, blurb: i.blurb, website: i.website || null,
    phone: i.phone || null, tags: i.tags,
  });

  /* ---------- friends ---------- */
  const lite = (id: string, handle: string, name: string, avatar?: string | null, role?: string | null): MemberLite => ({
    id, handle, name, ...(avatar ? { avatar } : {}), ...(role === "editor" ? { role: "editor" as const } : {}),
  });
  const mapMe = (r: Record<string, any>): Me => ({
    ...lite(r.id, r.handle, r.display_name, r.avatar_url, r.role),
    bio: r.bio ?? "", private: !!r.is_private, top: r.top_spots ?? [], since: r.created_at, comments: r.comments ?? "anyone",
    handle: r.handle, inSearch: r.in_search !== false, shareVisits: r.share_visits !== false, shareSaved: r.share_saved !== false,
    handleChangedAt: r.handle_changed_at ?? undefined,
  });
  const mapPerson = (r: Record<string, any>): Person => ({
    ...lite(r.id, r.handle, r.display_name, r.avatar_url, r.role),
    private: !!r.is_private, bio: r.bio ?? undefined, iFollow: (r.i_follow ?? "none") as FollowState, followsMe: !!r.follows_me,
    reviews: r.reviews == null ? undefined : Number(r.reviews), reason: r.reason ?? undefined,
  });
  /** the database before the friends update was run on it */
  const noFriends = (e: { code?: string; message?: string } | null) =>
    !!e && (e.code === "PGRST202" || e.code === "42883" || e.code === "42P01" || e.code === "PGRST205" || /does not exist|Could not find the (function|table)/i.test(e.message ?? ""));
  const needsUpdate = () => new Error("Friends aren't switched on yet: the site's database needs its update (README → Friends).");
  const fail = (e: { code?: string; message?: string }) => (noFriends(e) ? needsUpdate() : new Error(e.message || "Something went wrong. Try again?"));
  const mapComment = (c: Record<string, any>, who: Map<string, MemberLite>): Comment => ({
    id: c.id, reviewId: c.review_id, parentId: c.parent_id ?? undefined, body: c.body ?? null, status: c.status, createdAt: c.created_at,
    editedAt: c.edited_at ?? undefined, user: who.get(c.user_id) ?? lite(c.user_id, "", "A member"),
  });
  async function membersById(ids: string[]) {
    const out = new Map<string, MemberLite & { comments?: CommentPolicy }>();
    if (!ids.length) return out;
    const { data } = await sb.from("members").select("id, handle, display_name, avatar_url, role, comments").in("id", Array.from(new Set(ids)));
    for (const m of data ?? []) out.set(m.id, { ...lite(m.id, m.handle, m.display_name, m.avatar_url, m.role), comments: m.comments ?? "anyone" });
    return out;
  }
  /** counts, my reactions, comment counts, each writer's total and @name: extras, so a missing view never hides reviews */
  async function decorate(list: Review[]): Promise<Review[]> {
    if (!list.length) return list;
    const rIds = list.map((r) => r.id);
    const uIds = Array.from(new Set(list.map((r) => r.userId)));
    const me = (await sb.auth.getSession()).data.session?.user.id;
    const none = Promise.resolve({ data: [] as any[], error: null });
    const [rx, mine, cc, tot, who] = await Promise.all([
      sb.from("review_reactions").select("review_id, kind, n").in("review_id", rIds),
      me ? sb.from("review_votes").select("review_id, kind").eq("user_id", me).in("review_id", rIds) : none,
      sb.from("review_comment_counts").select("review_id, n").in("review_id", rIds),
      sb.from("reviewer_totals").select("user_id, reviews").in("user_id", uIds),
      membersById(uIds),
    ]);
    const counts = new Map<string, Partial<Record<Reaction, number>>>();
    if (rx.error) {
      // before the friends update: Helpful is the only reaction
      const h = await sb.from("review_helpful").select("review_id, helpful").in("review_id", rIds);
      for (const x of h.data ?? []) counts.set(x.review_id, { helpful: Number(x.helpful) });
    } else for (const x of rx.data ?? []) counts.set(x.review_id, { ...(counts.get(x.review_id) ?? {}), [x.kind]: Number(x.n) });
    let mineRows: { review_id: string; kind?: string }[] = mine.data ?? [];
    if (mine.error && me) mineRows = (await sb.from("review_votes").select("review_id").eq("user_id", me).in("review_id", rIds)).data ?? [];
    const my = new Map<string, Reaction[]>();
    for (const x of mineRows) my.set(x.review_id, [...(my.get(x.review_id) ?? []), (x.kind ?? "helpful") as Reaction]);
    const comments = new Map<string, number>((cc.data ?? []).map((x: any) => [x.review_id, Number(x.n)]));
    const totals = new Map<string, number>((tot.data ?? []).map((x: any) => [x.user_id, Number(x.reviews)]));
    return list.map((r) => {
      const rc = counts.get(r.id) ?? {};
      const mr = my.get(r.id) ?? [];
      return {
        ...r, reactions: rc, myReactions: mr, helpful: rc.helpful ?? 0, votedHelpful: mr.includes("helpful"), comments: comments.get(r.id) ?? 0,
        reviewerCount: totals.get(r.userId), handle: who.get(r.userId)?.handle, writerComments: who.get(r.userId)?.comments,
        ...(who.get(r.userId) ? { userName: who.get(r.userId)!.name } : {}),
      };
    });
  }

  return {
    mode: "supabase",
    async myMember() {
      const { data: s } = await sb.auth.getSession();
      if (!s.session) return null;
      const { data, error } = await sb.rpc("ensure_member");
      if (error || !data) return null;
      return mapMe(data);
    },
    async saveMember(p) {
      const uid = await sessionUserId();
      const row: Record<string, unknown> = {};
      if (p.handle !== undefined) row.handle = p.handle;
      if (p.bio !== undefined) row.bio = p.bio;
      if (p.private !== undefined) row.is_private = p.private;
      if (p.inSearch !== undefined) row.in_search = p.inSearch;
      if (p.shareVisits !== undefined) row.share_visits = p.shareVisits;
      if (p.shareSaved !== undefined) row.share_saved = p.shareSaved;
      if (p.comments !== undefined) row.comments = p.comments;
      if (p.top !== undefined) row.top_spots = p.top;
      // other members can't read these settings, so the saved row comes back through ensure_member
      const { error } = await sb.from("members").update(row).eq("id", uid);
      if (error) throw /members_handle_key|duplicate/i.test(error.message) ? new Error("That @name is taken. Try another.") : fail(error);
      const { data, error: e2 } = await sb.rpc("ensure_member");
      if (e2 || !data) throw fail(e2 ?? { message: "Saved. Reload to see it." });
      return mapMe(data);
    },
    async handleFree(h) {
      const { data, error } = await sb.rpc("handle_free", { h });
      return !error && data === true;
    },
    async memberPage(handle) {
      const { data, error } = await sb.rpc("member_page", { h: handle });
      if (error) throw fail(error);
      if (!data) return null;
      const m = data.member;
      return {
        member: { ...lite(m.id, m.handle, m.name, m.avatar, m.role), bio: m.bio ?? undefined, private: !!m.private, top: m.top ?? [], since: m.since, comments: m.comments },
        visible: !!data.visible,
        stats: { following: Number(data.stats.following), followers: Number(data.stats.followers), reviews: Number(data.stats.reviews), been: data.stats.been == null ? null : Number(data.stats.been) },
        rel: data.rel ? { following: data.rel.following, followsMe: !!data.rel.followsMe, muted: !!data.rel.muted, blocked: !!data.rel.blocked } : null,
        match: data.match ? { common: Number(data.match.common), agree: Number(data.match.agree) } : null,
      };
    },
    async memberPlaces(id) {
      const { data, error } = await sb.rpc("member_places", { target: id });
      if (error) throw fail(error);
      return (data ?? []).map((r: any) => ({
        spotId: canonicalSpotId(r.spot_id), verdict: r.verdict ?? undefined, rating: r.rating ?? undefined, reviewId: r.review_id ?? undefined,
        been: r.been_on ?? undefined, saved: !!r.saved, savedOn: r.saved_on ?? undefined,
      }));
    },
    async memberReviews(id) {
      const { data, error } = await sb.from("reviews").select("*").eq("user_id", id).eq("status", "live").order("created_at", { ascending: false });
      if (error) throw error;
      return decorate((data ?? []).map(mapReview));
    },
    async network(id, which) {
      const { data, error } = await sb.rpc("network", { target: id, which });
      if (error) throw fail(error);
      return (data ?? []).map(mapPerson);
    },
    async follow(id, on) {
      const uid = await sessionUserId();
      if (!on) {
        const { error } = await sb.from("follows").delete().eq("follower_id", uid).eq("followee_id", id);
        if (error) throw fail(error);
        return "none";
      }
      const { data, error } = await sb.from("follows").insert({ follower_id: uid, followee_id: id }).select("status").single();
      if (error && /duplicate/i.test(error.message)) {
        const { data: cur } = await sb.from("follows").select("status").eq("follower_id", uid).eq("followee_id", id).maybeSingle();
        return (cur?.status ?? "accepted") as FollowState;
      }
      if (error) throw fail(error);
      return data.status as FollowState;
    },
    async requests() {
      const { data, error } = await sb.rpc("my_requests");
      if (error) return [];
      return (data ?? []).map((r: any) => ({ ...lite(r.id, r.handle, r.display_name, r.avatar_url), at: r.requested_at }));
    },
    async answerRequest(id, accept) {
      const uid = await sessionUserId();
      const q = accept
        ? sb.from("follows").update({ status: "accepted" }).eq("follower_id", id).eq("followee_id", uid)
        : sb.from("follows").delete().eq("follower_id", id).eq("followee_id", uid);
      const { error } = await q;
      if (error) throw fail(error);
    },
    async removeFollower(id) {
      const uid = await sessionUserId();
      const { error } = await sb.from("follows").delete().eq("follower_id", id).eq("followee_id", uid);
      if (error) throw fail(error);
    },
    async block(id, on) {
      const uid = await sessionUserId();
      const { error } = on
        ? await sb.from("blocks").upsert({ blocker_id: uid, blocked_id: id }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true })
        : await sb.from("blocks").delete().eq("blocker_id", uid).eq("blocked_id", id);
      if (error) throw fail(error);
    },
    async mute(id, on) {
      const uid = await sessionUserId();
      const { error } = on
        ? await sb.from("mutes").upsert({ muter_id: uid, muted_id: id }, { onConflict: "muter_id,muted_id", ignoreDuplicates: true })
        : await sb.from("mutes").delete().eq("muter_id", uid).eq("muted_id", id);
      if (error) throw fail(error);
    },
    async blocked() {
      const { data, error } = await sb.rpc("my_blocked");
      if (error) return [];
      return (data ?? []).map((r: any) => lite(r.id, r.handle, r.display_name, r.avatar_url));
    },
    async reportMember(id, reason, note) {
      const uid = await sessionUserId();
      const { error } = await sb.from("member_reports").insert({ member_id: id, user_id: uid, reason, note: note || null });
      if (error && !/duplicate/i.test(error.message)) throw fail(error);
    },
    async searchMembers(q) {
      const { data, error } = await sb.rpc("search_members", { q, lim: 20 });
      if (error) throw fail(error);
      return (data ?? []).map(mapPerson);
    },
    async suggestedMembers() {
      const { data, error } = await sb.rpc("suggested_members", { lim: 12 });
      if (error) return [];
      return (data ?? []).map(mapPerson);
    },
    async feed(scope, before) {
      const { data, error } = await sb.rpc("feed", { scope, before_at: before?.at ?? null, before_id: before?.id ?? null, lim: 40 });
      if (error) throw fail(error);
      const items: Activity[] = (data ?? []).map((a: any) => ({
        id: Number(a.id), kind: a.kind, spotId: a.spot_id ? canonicalSpotId(a.spot_id) : undefined, reviewId: a.review_id ?? undefined,
        verdict: a.verdict ?? undefined, at: a.created_at, actor: lite(a.actor_id, a.actor_handle, a.actor_name, a.actor_avatar, a.actor_role),
        ...(a.target_id ? { target: lite(a.target_id, a.target_handle, a.target_name) } : {}),
      }));
      const ids = items.filter((a) => a.reviewId).map((a) => a.reviewId!);
      const reviews: Record<string, Review> = {};
      if (ids.length) {
        const { data: rows } = await sb.from("reviews").select("*").in("id", ids);
        for (const r of await decorate((rows ?? []).map(mapReview))) reviews[r.id] = { ...r, spotId: canonicalSpotId(r.spotId) };
      }
      return { items: items.filter((a) => a.kind !== "review" || reviews[a.reviewId!]), reviews };
    },
    async friendsAt(spotIds) {
      const { data: s } = await sb.auth.getSession();
      if (!s.session) return [];
      const { data, error } = await sb.rpc("friends_at", { spot_ids: spotIds });
      if (error) return [];
      return (data ?? []).map((r: any) => ({
        member: lite(r.user_id, r.handle, r.display_name, r.avatar_url), spotId: canonicalSpotId(r.spot_id), rating: r.rating ?? undefined,
        verdict: r.verdict ?? undefined, reviewId: r.review_id ?? undefined, saved: !!r.saved,
      }));
    },
    async react(reviewId, kind, on) {
      const uid = await sessionUserId();
      let { error } = on
        ? await sb.from("review_votes").upsert({ review_id: reviewId, user_id: uid, kind }, { onConflict: "review_id,user_id,kind", ignoreDuplicates: true })
        : await sb.from("review_votes").delete().eq("review_id", reviewId).eq("user_id", uid).eq("kind", kind);
      // before the friends update, only Helpful exists
      if (error && kind === "helpful" && oldSchema(error)) {
        ({ error } = on
          ? await sb.from("review_votes").upsert({ review_id: reviewId, user_id: uid }, { onConflict: "review_id,user_id", ignoreDuplicates: true })
          : await sb.from("review_votes").delete().eq("review_id", reviewId).eq("user_id", uid));
      }
      if (error) throw oldSchema(error) ? needsUpdate() : new Error(error.message);
    },
    async listComments(reviewId) {
      const { data, error } = await sb.from("review_comments").select("*").eq("review_id", reviewId).order("created_at", { ascending: true });
      if (error) throw fail(error);
      const who = await membersById((data ?? []).map((c: any) => c.user_id));
      return (data ?? []).map((c: any) => mapComment(c, who));
    },
    async addComment(reviewId, body, parentId) {
      const uid = await sessionUserId();
      const { data, error } = await sb.from("review_comments").insert({ review_id: reviewId, user_id: uid, body, parent_id: parentId ?? null }).select().single();
      if (error) throw fail(error);
      return mapComment(data, await membersById([uid]));
    },
    async editComment(id, body) {
      const { data, error } = await sb.from("review_comments").update({ body }).eq("id", id).select().single();
      if (error) throw fail(error);
      return mapComment(data, await membersById([data.user_id]));
    },
    async deleteComment(id) {
      const { error } = await sb.from("review_comments").delete().eq("id", id);
      if (error) throw fail(error);
    },
    async hideComment(id, hidden) {
      const { error } = await sb.from("review_comments").update({ status: hidden ? "hidden" : "live" }).eq("id", id);
      if (error) throw fail(error);
    },
    async reportComment(id, reason) {
      const uid = await sessionUserId();
      const { error } = await sb.from("comment_reports").insert({ comment_id: id, user_id: uid, reason });
      if (error && !/duplicate/i.test(error.message)) throw fail(error);
    },
    async notes() {
      const { data: s } = await sb.auth.getSession();
      if (!s.session) return [];
      const { data, error } = await sb.rpc("my_notifications", { lim: 80 });
      if (error) return [];
      return (data ?? []).map((n: any) => ({
        id: Number(n.id), kind: n.kind, reviewId: n.review_id ?? undefined, commentId: n.comment_id ?? undefined,
        spotId: n.spot_id ? canonicalSpotId(n.spot_id) : undefined, detail: n.detail ?? undefined, at: n.created_at, read: !!n.read_at,
        ...(n.actor_id && n.actor_handle ? { actor: lite(n.actor_id, n.actor_handle, n.actor_name, n.actor_avatar) } : {}),
      }));
    },
    async unread() {
      const { data: s } = await sb.auth.getSession();
      if (!s.session) return 0;
      const { count, error } = await sb.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      return error ? 0 : count ?? 0;
    },
    async markRead() {
      const uid = await sessionUserId();
      await sb.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", uid).is("read_at", null);
    },
    async sendGiftNote(toId, spotId, note) {
      const { error } = await sb.rpc("send_gift_note", { to_member: toId, spot: spotId, note });
      if (error) throw fail(error);
    },
    async savePushToken(token) {
      const { data: s } = await sb.auth.getSession();
      if (!s.session) return;
      // one phone, one account: signing in as someone else on it moves the address to them
      await sb.rpc("save_push_token", { t: token });
    },
    async myReviews() {
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return [];
      const { data } = await sb.from("reviews").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false });
      return decorate((data ?? []).map(mapReview));
    },
    async myPhotos() {
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return [];
      const { data } = await sb.from("photos").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false });
      return (data ?? []).map(mapPhoto);
    },
    async updateName(name) {
      const { data, error } = await sb.auth.updateUser({ data: { display_name: name.trim().slice(0, 40) } });
      if (error) throw error;
      return toUser(data.user)!;
    },
    async updateHome(home) {
      const { data, error } = await sb.auth.updateUser({ data: { home_city: home.slice(0, 80) } });
      if (error) throw error;
      return toUser(data.user)!;
    },
    async waitlist(email, state, city) {
      const { error } = await sb.from("waitlist").insert({ email, state, city });
      if (error && !String(error.message).includes("duplicate")) throw error;
    },
    async listSpots(cityId) {
      const { data, error } = await sb.from("spots").select("*").eq("city_id", cityId).eq("status", "live");
      if (error) return [];
      return (data ?? []).map(mapSpot);
    },
    async getSpot(id) {
      const { data } = await sb.from("spots").select("*").eq("id", id).eq("status", "live").maybeSingle();
      return data ? mapSpot(data) : null;
    },
    async submitSpot(input, note, photo) {
      const u = await requireUser();
      let photo_url: string | null = null;
      if (photo) {
        const blob = await resizeImage(photo, 1600, 0.82);
        const path = `${u.id}/submissions/${Date.now()}.jpg`;
        const up = await sb.storage.from("spot-photos").upload(path, blob, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        photo_url = sb.storage.from("spot-photos").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await sb
        .from("submissions")
        .insert({ ...inputRow(input), submitted_by: u.id, submitter_name: u.name, note: note || null, photo_url })
        .select()
        .single();
      if (error) throw new Error(error.message.includes("row-level security") ? "You have 10 spots waiting for review — hang tight while we verify those first." : error.message);
      return mapSub(data);
    },
    async mySubmissions() {
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return [];
      const { data } = await sb.from("submissions").select("*").eq("submitted_by", auth.user.id).order("created_at", { ascending: false });
      return (data ?? []).map(mapSub);
    },
    async isAdmin() {
      const { data } = await sb.rpc("is_admin");
      return data === true;
    },
    async listSubmissions(status) {
      const { data, error } = await sb.from("submissions").select("*").eq("status", status).order("created_at", { ascending: status === "pending" });
      if (error) throw error;
      return (data ?? []).map(mapSub);
    },
    async approveSubmission(sub, edits, checklist) {
      const u = await requireUser();
      const reviewedAt = new Date().toISOString();
      const id = newSpotId(edits.name);
      const spot = spotFrom(sub, edits, id, reviewedAt);
      const ins = await sb.from("spots").insert({
        id, ...inputRow(edits), pop: edits.pop, status: "live", added_by: sub.submitterName, submitted_by: sub.submittedBy,
        verified_at: reviewedAt, verified_by: u.id, submission_id: sub.id,
      });
      if (ins.error) throw ins.error;
      const upd = await sb
        .from("submissions")
        .update({ status: "approved", spot_id: id, checklist, reviewed_at: reviewedAt, reviewed_by: u.id })
        .eq("id", sub.id);
      if (upd.error) throw upd.error;
      if (sub.photoUrl)
        await sb.from("photos").insert({ spot_id: id, user_id: sub.submittedBy, display_name: sub.submitterName, url: sub.photoUrl, kind: "building" });
      return spot;
    },
    async rejectSubmission(id, reason) {
      const u = await requireUser();
      const { error } = await sb
        .from("submissions")
        .update({ status: "rejected", reject_reason: reason, reviewed_at: new Date().toISOString(), reviewed_by: u.id })
        .eq("id", id);
      if (error) throw error;
    },
    async getUser() {
      const { data } = await sb.auth.getSession();
      return toUser(data.session?.user);
    },
    onAuth(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, session) => cb(toUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },
    async sendCode(email) {
      const e = email.trim().toLowerCase();
      if (!EMAIL_RE.test(e)) throw new Error("That email doesn't look right.");
      const { error } = await sb.auth.signInWithOtp({
        email: e,
        options: { shouldCreateUser: true, emailRedirectTo: callback(location.pathname + location.search) },
      });
      // a server error here is almost always the email not going out (e.g. the free plan's daily cap)
      if (error) throw (error.status ?? 0) >= 500 ? friendly({ message: "error sending" }) : friendly(error);
      return {};
    },
    async verifyCode(email, code) {
      const { data, error } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.replace(/\D/g, ""), type: "email" });
      if (error || !data.user) throw friendly(error);
      return toUser(data.user)!;
    },
    googleClientId: GOOGLE_CLIENT_ID,
    async signInWithGoogleToken(idToken, nonce) {
      const { data, error } = await sb.auth.signInWithIdToken({ provider: "google", token: idToken, nonce });
      if (error || !data.user) throw friendly(error);
      return toUser(data.user)!;
    },
    async signInWithGoogleRedirect(next) {
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback(next) } });
      if (error) throw friendly(error);
    },
    canUsePasskeys() {
      return PASSKEYS_ON && typeof window !== "undefined" && "PublicKeyCredential" in window;
    },
    async signInWithPasskey(opts) {
      const { data, error } = await sb.auth.signInWithPasskey({
        options: { ...(opts?.conditional ? { mediation: "conditional" as const } : {}), ...(opts?.signal ? { signal: opts.signal } : {}) },
      });
      if (error) throw error;
      return toUser(data?.user);
    },
    async registerPasskey() {
      const { error } = await sb.auth.registerPasskey();
      if (error) throw friendly(error);
    },
    async passkeyCount() {
      const { data, error } = await sb.auth.passkey.list();
      return error ? 0 : data?.length ?? 0;
    },
    async signOut() {
      // no more notifications on this phone for an account that isn't signed in on it
      const push = currentPushToken();
      if (push) await sb.from("push_tokens").delete().eq("token", push).then(() => {}, () => {});
      // this device only; signing out on your phone shouldn't sign you out on your laptop
      await sb.auth.signOut({ scope: "local" });
    },
    async deleteAccount() {
      const { data: s } = await sb.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Sign in first.");
      const r = await fetch("/api/account/delete", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 501) {
        // the server key isn't configured: fall back to the database function
        const { error } = await sb.rpc("delete_my_account");
        if (error) throw new Error("We couldn't delete your account. Email us and we'll do it right away.");
      } else if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "We couldn't delete your account. Email us and we'll do it right away.");
      }
      await sb.auth.signOut({ scope: "local" }).catch(() => {});
    },
    async pullLists() {
      const { data: auth } = await sb.auth.getSession();
      if (!auth.session) return { saved: [], been: {} };
      const [sv, st] = await Promise.all([sb.from("saved_spots").select("spot_id"), sb.from("stamps").select("spot_id, verdict, stamped_at")]);
      if (sv.error) throw sv.error;
      if (st.error) throw st.error;
      return {
        saved: (sv.data ?? []).map((r: any) => r.spot_id as string),
        been: Object.fromEntries((st.data ?? []).map((r: any) => [r.spot_id, { at: r.stamped_at, ...(r.verdict ? { verdict: r.verdict } : {}) }])),
      };
    },
    async putSaved(spotId, on) {
      const uid = await sessionUserId();
      const { error } = on
        ? await sb.from("saved_spots").upsert({ user_id: uid, spot_id: spotId }, { onConflict: "user_id,spot_id", ignoreDuplicates: true })
        : await sb.from("saved_spots").delete().eq("user_id", uid).eq("spot_id", spotId);
      if (error) throw error;
    },
    async putStamp(spotId, stamp) {
      const uid = await sessionUserId();
      const { error } = stamp
        ? await sb
            .from("stamps")
            .upsert(
              { user_id: uid, spot_id: spotId, verdict: stamp.verdict ?? null, stamped_at: stamp.at, updated_at: new Date().toISOString() },
              { onConflict: "user_id,spot_id" }
            )
        : await sb.from("stamps").delete().eq("user_id", uid).eq("spot_id", spotId);
      if (error) throw error;
    },
    async pushLists(saved, been) {
      const uid = await sessionUserId();
      if (saved.length) {
        const { error } = await sb
          .from("saved_spots")
          .upsert(saved.map((spot_id) => ({ user_id: uid, spot_id })), { onConflict: "user_id,spot_id", ignoreDuplicates: true });
        if (error) throw error;
      }
      const rows = Object.entries(been).map(([spot_id, s]) => ({ user_id: uid, spot_id, verdict: s.verdict ?? null, stamped_at: s.at }));
      if (rows.length) {
        const { error } = await sb.from("stamps").upsert(rows, { onConflict: "user_id,spot_id" });
        if (error) throw error;
      }
    },
    async listReviews(spotIds) {
      const ids = Array.isArray(spotIds) ? spotIds : [spotIds];
      const { data, error } = await sb.from("reviews").select("*").in("spot_id", ids).order("created_at", { ascending: false });
      if (error) throw error;
      return decorate((data ?? []).map(mapReview).filter((r) => r.status !== "removed"));
    },
    async addReview(spotId, i) {
      const u = await requireUser();
      const base = { spot_id: spotId, user_id: u.id, display_name: u.name, rating: i.rating, body: i.body };
      const full = {
        ...base,
        go_back: i.goBack,
        visited_on: `${i.visited}-01`,
        ordered: i.ordered,
        good_for: i.goodFor,
        sub_taste: i.sub.taste ?? null,
        sub_service: i.sub.service ?? null,
        sub_vibe: i.sub.vibe ?? null,
        affirmed_at: new Date().toISOString(),
      };
      let res = await sb.from("reviews").upsert(full, { onConflict: "spot_id,user_id" }).select().single();
      if (oldSchema(res.error)) res = await sb.from("reviews").upsert(base, { onConflict: "spot_id,user_id" }).select().single();
      if (res.error) throw new Error(res.error.message || "Couldn't post that review.");
      return { ...mapReview(res.data), helpful: 0 };
    },
    async voteHelpful(reviewId, on) {
      return this.react(reviewId, "helpful", on);
    },
    async reportReview(reviewId, reason, note) {
      const uid = await sessionUserId();
      const { error } = await sb.from("review_reports").insert({ review_id: reviewId, user_id: uid, reason, note: note || null });
      if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
    },
    async deleteReview(id) {
      const { error } = await sb.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    async listPhotos(spotId) {
      const { data, error } = await sb.from("photos").select("*").eq("spot_id", spotId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapPhoto);
    },
    async addPhoto(spotId, file, kind, caption) {
      const u = await requireUser();
      const blob = await resizeImage(file, 1600, 0.82);
      const path = `${u.id}/${spotId}/${Date.now()}.jpg`;
      const up = await sb.storage.from("spot-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const url = sb.storage.from("spot-photos").getPublicUrl(path).data.publicUrl;
      const { data, error } = await sb
        .from("photos")
        .insert({ spot_id: spotId, user_id: u.id, display_name: u.name, url, kind, caption: caption || null })
        .select()
        .single();
      if (error) throw error;
      return mapPhoto(data);
    },
    async ratings() {
      const { data, error } = await sb.from("spot_ratings").select("*");
      if (error) return {};
      return foldAliases(
        (data ?? []).map((r: any) => ({ id: r.spot_id, avg: Number(r.avg_rating), count: Number(r.review_count), goBack: r.go_back_pct == null ? null : Number(r.go_back_pct) }))
      );
    },
    async subscribe(email) {
      const { error } = await sb.from("subscribers").insert({ email });
      if (error && !String(error.message).includes("duplicate")) throw error;
    },
    async lead(l) {
      const { error } = await sb.from("partner_leads").insert(l);
      if (error) throw error;
    },
  };
}

/* ======================= LOCAL (DEMO) FALLBACK ======================== */
// Works with zero configuration so the site is fully usable on first deploy.
// Everything lives in this browser's localStorage.

const K = {
  users: "tl.users", session: "tl.session", reviews: "tl.reviews", photos: "tl.photos", subs: "tl.subs", leads: "tl.leads",
  submissions: "tl.submissions", spots: "tl.spots", waitlist: "tl.waitlist", votes: "tl.reviewVotes", reports: "tl.reviewReports",
  // friends, on this device (other members here are seeded, e.g. by tests)
  members: "tl.members", follows: "tl.follows", blocks: "tl.blocks", mutes: "tl.mutes", reactions: "tl.reactions",
  comments: "tl.comments", notes: "tl.notes", places: "tl.memberPlaces", handles: "tl.handleHistory", memberReports: "tl.memberReports",
  commentReports: "tl.commentReports",
};
type LMember = Omit<Me, "avatar"> & { avatar?: string };
type LFollow = { a: string; b: string; status: "accepted" | "pending"; at: string };
type LPair = { a: string; b: string };
type LComment = { id: string; reviewId: string; parentId?: string; userId: string; body: string | null; status: Comment["status"]; createdAt: string; editedAt?: string };
type LNote = Omit<Note, "actor"> & { to: string; actorId?: string };
type LPlace = { spotId: string; verdict?: Verdict; at?: string; saved?: boolean; savedOn?: string };
/** a small, steady number for a string, so demo feed items have ids to page by */
const numId = (k: string) => {
  let h = 5381;
  for (let i = 0; i < k.length; i++) h = ((h * 33) ^ k.charCodeAt(i)) >>> 0;
  return h;
};
/** the same words the database keeps back (supabase/schema.sql → reserved_handles) */
const RESERVED = new Set(("about admin api auth best credits edit editor everyone explore feed friends gift help home login logout me members mod moderator " +
  "neighborhood new notifications null official partners passport people plate platenextdoor privacy root search settings signin signup spot staff support " +
  "team theplatenextdoor undefined user users you").split(" "));
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

function read<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    throw new Error("This browser is out of storage space for demo data.");
  }
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

function blobToDataUrl(b: Blob) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(b);
  });
}

function localBackend(): Backend {
  const listeners = new Set<(u: User | null) => void>();
  const current = (): User | null => read<User | null>(K.session, null);
  const emit = () => listeners.forEach((l) => l(current()));
  type StoredUser = User & { hash?: string };
  const signOutLocal = () => {
    localStorage.removeItem(K.session);
    emit();
  };

  /* ---------- friends helpers ---------- */
  const members = () => read<LMember[]>(K.members, []);
  const memberOf = (id: string) => members().find((m) => m.id === id) ?? null;
  const follows = () => read<LFollow[]>(K.follows, []);
  const blocks = () => read<LPair[]>(K.blocks, []);
  const mutes = () => read<LPair[]>(K.mutes, []);
  const blockedWith = (a: string, b: string) => blocks().some((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  const liteOf = (m: LMember): MemberLite => ({ id: m.id, handle: m.handle, name: m.name, ...(m.avatar ? { avatar: m.avatar } : {}), ...(m.role === "editor" ? { role: "editor" as const } : {}) });
  const canView = (viewer: string | null, target: string) => {
    if (viewer === target) return true;
    const m = memberOf(target);
    if (!m || (viewer && blockedWith(viewer, target))) return false;
    return !m.private || follows().some((f) => f.a === viewer && f.b === target && f.status === "accepted");
  };
  const personOf = (m: LMember, viewer: string | null): Person => {
    const fs = follows();
    return {
      ...liteOf(m), private: m.private, bio: m.bio || undefined,
      iFollow: (fs.find((f) => f.a === viewer && f.b === m.id)?.status ?? "none") as FollowState,
      followsMe: fs.some((f) => f.a === m.id && f.b === viewer && f.status === "accepted"),
      reviews: read<Review[]>(K.reviews, []).filter((r) => r.userId === m.id).length,
    };
  };
  /** the signed-in member's own places live where the passport keeps them; others' are seeded */
  const placesOf = (id: string): LPlace[] => {
    if (id === current()?.id) {
      const been = read<BeenMap>("tl.been", {});
      const saved = read<string[]>("tl.saved", []);
      const out = new Map<string, LPlace>(Object.entries(been).map(([spotId, st]) => [spotId, { spotId, at: st.at, verdict: st.verdict }]));
      for (const sp of saved) out.set(sp, { ...(out.get(sp) ?? { spotId: sp }), saved: true, savedOn: out.get(sp)?.savedOn ?? new Date().toISOString() });
      return [...out.values()];
    }
    return read<Record<string, LPlace[]>>(K.places, {})[id] ?? [];
  };
  const handleOk = (h: string, me: string | null) => {
    if (handleProblem(h) || RESERVED.has(h)) return false;
    if (members().some((m) => m.handle === h && m.id !== me)) return false;
    const old = read<Record<string, { id: string; at: string }>>(K.handles, {})[h];
    return !old || old.id === me || Date.now() - +new Date(old.at) > 90 * 86400e3;
  };
  const ensureMe = (): LMember | null => {
    const u = current();
    // no name picked yet: an @name made now would come from the email address
    if (!u || u.needsName) return null;
    const have = memberOf(u.id);
    if (have) return have.name === u.name ? have : (write(K.members, members().map((m) => (m.id === u.id ? { ...m, name: u.name } : m))), { ...have, name: u.name });
    const base = handleFrom(u.name || "Local");
    let h = base;
    for (let i = 0; !handleOk(h, u.id); i++) h = base + (10 + Math.floor(Math.random() * (i < 5 ? 90 : 99990)));
    const m: LMember = {
      id: u.id, handle: h, name: u.name || "Local", bio: "", private: false, inSearch: true, shareVisits: true, shareSaved: true, comments: "anyone", top: [],
      since: new Date().toISOString(),
    };
    write(K.members, [...members(), m]);
    return m;
  };
  const notifyLocal = (to: string, actor: string, kind: Note["kind"], extra: Partial<Pick<Note, "reviewId" | "commentId" | "spotId" | "detail">>) => {
    if (to === actor || blockedWith(to, actor) || mutes().some((x) => x.a === to && x.b === actor)) return;
    const all = read<LNote[]>(K.notes, []);
    const id = all.reduce((n, x) => Math.max(n, x.id), 0) + 1;
    write(K.notes, [...all, { id, to, actorId: actor, kind, ...extra, at: new Date().toISOString(), read: false }]);
  };
  /** reactions per review; the older Helpful votes count as Helpful */
  const reactions = () => {
    const all = read<Record<string, Partial<Record<Reaction, string[]>>>>(K.reactions, {});
    for (const [rid, who] of Object.entries(read<Record<string, string[]>>(K.votes, {}))) {
      const cur = new Set([...(all[rid]?.helpful ?? []), ...who]);
      all[rid] = { ...(all[rid] ?? {}), helpful: [...cur] };
    }
    return all;
  };
  const decorateLocal = (list: Review[]): Review[] => {
    const me = current()?.id;
    const all = read<Review[]>(K.reviews, []);
    const rx = reactions();
    const cs = read<LComment[]>(K.comments, []);
    return list
      .filter((r) => !(me && blockedWith(me, r.userId)))
      .map((r) => {
        const counts = Object.fromEntries(Object.entries(rx[r.id] ?? {}).map(([k, v]) => [k, v?.length ?? 0]).filter(([, n]) => n)) as Partial<Record<Reaction, number>>;
        const mine = (Object.entries(rx[r.id] ?? {}) as [Reaction, string[]][]).filter(([, v]) => !!me && v.includes(me)).map(([k]) => k);
        const m = memberOf(r.userId);
        return {
          ...r, reactions: counts, myReactions: mine, helpful: counts.helpful ?? 0, votedHelpful: mine.includes("helpful"),
          comments: cs.filter((c) => c.reviewId === r.id && c.status === "live").length,
          reviewerCount: all.filter((x) => x.userId === r.userId).length, ...(m ? { handle: m.handle, userName: m.name, writerComments: m.comments } : {}),
        };
      });
  };
  const commentOf = (c: LComment): Comment => {
    const m = memberOf(c.userId);
    return {
      id: c.id, reviewId: c.reviewId, parentId: c.parentId, body: c.body, status: c.status, createdAt: c.createdAt, editedAt: c.editedAt,
      user: m ? liteOf(m) : { id: c.userId, handle: "", name: "A member" },
    };
  };
  /** "You agree on 7 of 9": scores within a point count as agreeing */
  const tasteMatch = (a: string, b: string) => {
    const score = (id: string) => {
      const out = new Map<string, number>();
      if (id === a || memberOf(id)?.shareVisits) for (const p of placesOf(id)) if (p.verdict) out.set(p.spotId, VERDICT_SCORE[p.verdict]);
      for (const r of read<Review[]>(K.reviews, [])) if (r.userId === id) out.set(r.spotId, r.rating);
      return out;
    };
    const sa = score(a);
    const sb2 = score(b);
    let common = 0;
    let agree = 0;
    for (const [spot, v] of sa) {
      const w = sb2.get(spot);
      if (w === undefined) continue;
      common++;
      if (Math.abs(v - w) <= 1) agree++;
    }
    return { common, agree };
  };

  return {
    mode: "local",
    /* ---------- friends, on this device ---------- */
    async myMember() {
      return ensureMe();
    },
    async saveMember(p) {
      const m = ensureMe();
      if (!m) throw new Error("Sign in first.");
      const next: LMember = { ...m };
      if (p.handle !== undefined && p.handle !== m.handle) {
        const h = p.handle.toLowerCase();
        const bad = handleProblem(h);
        if (bad) throw new Error(bad);
        if (m.handleChangedAt && Date.now() - +new Date(m.handleChangedAt) < 30 * 86400e3) throw new Error("You can change your @name once a month.");
        if (!handleOk(h, m.id)) throw new Error(`@${h} is taken or not allowed. Try another.`);
        write(K.handles, { ...read<Record<string, { id: string; at: string }>>(K.handles, {}), [m.handle]: { id: m.id, at: new Date().toISOString() } });
        next.handle = h;
        next.handleChangedAt = new Date().toISOString();
      }
      if (p.bio !== undefined) next.bio = p.bio.replace(/\s+/g, " ").trim().slice(0, 160);
      if (hasBannedWord(`${next.bio ?? ""} ${next.handle.replace(/_/g, " ")}`)) throw new Error(BANNED_MESSAGE);
      if (p.private !== undefined) {
        next.private = p.private;
        // going public lets everyone who asked in
        if (!p.private) write(K.follows, follows().map((f) => (f.b === m.id && f.status === "pending" ? { ...f, status: "accepted" as const } : f)));
      }
      if (p.inSearch !== undefined) next.inSearch = p.inSearch;
      if (p.shareVisits !== undefined) next.shareVisits = p.shareVisits;
      if (p.shareSaved !== undefined) next.shareSaved = p.shareSaved;
      if (p.comments !== undefined) next.comments = p.comments;
      if (p.top !== undefined) next.top = Array.from(new Set(p.top)).slice(0, 4);
      write(K.members, members().map((x) => (x.id === m.id ? next : x)));
      return next;
    },
    async handleFree(h) {
      return handleOk(h.toLowerCase(), current()?.id ?? null);
    },
    async memberPage(handle) {
      const meId = current()?.id ?? null;
      const h = handle.toLowerCase();
      let m = members().find((x) => x.handle === h);
      if (!m) {
        const old = read<Record<string, { id: string; at: string }>>(K.handles, {})[h];
        if (old && Date.now() - +new Date(old.at) < 90 * 86400e3) m = memberOf(old.id) ?? undefined;
      }
      if (!m) return null;
      const iBlocked = !!meId && blocks().some((b) => b.a === meId && b.b === m!.id);
      if (!iBlocked && meId && blockedWith(meId, m.id)) return null;
      const ok = !iBlocked && canView(meId, m.id);
      const fs = follows();
      return {
        member: { ...liteOf(m), bio: m.bio || undefined, private: m.private, top: ok ? m.top : [], since: m.since, comments: m.comments },
        visible: ok,
        stats: {
          following: fs.filter((f) => f.a === m!.id && f.status === "accepted").length,
          followers: fs.filter((f) => f.b === m!.id && f.status === "accepted").length,
          reviews: read<Review[]>(K.reviews, []).filter((r) => r.userId === m!.id && r.status !== "held").length,
          been: ok && (meId === m.id || m.shareVisits) ? placesOf(m.id).filter((p) => p.at).length : null,
        },
        rel: !meId || meId === m.id ? null : {
          following: (fs.find((f) => f.a === meId && f.b === m!.id)?.status ?? "none") as FollowState,
          followsMe: fs.some((f) => f.a === m!.id && f.b === meId && f.status === "accepted"),
          muted: mutes().some((x) => x.a === meId && x.b === m!.id),
          blocked: iBlocked,
        },
        match: ok && meId && meId !== m.id ? tasteMatch(meId, m.id) : null,
      };
    },
    async memberPlaces(id) {
      const meId = current()?.id ?? null;
      if (!canView(meId, id)) return [];
      const m = memberOf(id);
      const out = new Map<string, MemberPlace>();
      for (const p of placesOf(id)) {
        const cur = out.get(p.spotId) ?? { spotId: p.spotId, saved: false };
        if (p.at && (id === meId || m?.shareVisits !== false)) Object.assign(cur, { been: p.at.slice(0, 10), ...(p.verdict ? { verdict: p.verdict } : {}) });
        if (p.saved && (id === meId || m?.shareSaved !== false)) Object.assign(cur, { saved: true, savedOn: p.savedOn?.slice(0, 10) });
        out.set(p.spotId, cur);
      }
      for (const r of read<Review[]>(K.reviews, []).filter((x) => x.userId === id)) {
        const cur = out.get(r.spotId) ?? { spotId: r.spotId, saved: false };
        out.set(r.spotId, { ...cur, rating: r.rating, reviewId: r.id, been: cur.been ?? (r.visited ? `${r.visited}-01` : r.createdAt.slice(0, 10)) });
      }
      return [...out.values()].filter((p) => p.been || p.rating || p.saved);
    },
    async memberReviews(id) {
      return decorateLocal(read<Review[]>(K.reviews, []).filter((r) => r.userId === id && r.status !== "held").sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    async network(id, which) {
      const meId = current()?.id ?? null;
      if (!canView(meId, id)) return [];
      const fs = follows().filter((f) => f.status === "accepted" && (which === "followers" ? f.b === id : f.a === id));
      return fs
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((f) => memberOf(which === "followers" ? f.a : f.b))
        .filter((m): m is LMember => !!m && !(meId && blockedWith(meId, m.id)))
        .map((m) => personOf(m, meId));
    },
    async follow(id, on) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      ensureMe();
      const fs = follows();
      if (!on) {
        write(K.follows, fs.filter((f) => !(f.a === u.id && f.b === id)));
        write(K.notes, read<LNote[]>(K.notes, []).filter((n) => !(n.to === id && n.actorId === u.id && (n.kind === "follow" || n.kind === "request"))));
        return "none";
      }
      const cur = fs.find((f) => f.a === u.id && f.b === id);
      if (cur) return cur.status;
      if (blockedWith(u.id, id)) throw new Error("You can't follow this member.");
      const m = memberOf(id);
      if (!m) throw new Error("That member isn't here anymore.");
      const status = m.private ? "pending" : "accepted";
      write(K.follows, [...fs, { a: u.id, b: id, status, at: new Date().toISOString() }]);
      notifyLocal(id, u.id, status === "pending" ? "request" : "follow", {});
      return status;
    },
    async requests() {
      const u = current();
      if (!u) return [];
      return follows()
        .filter((f) => f.b === u.id && f.status === "pending")
        .map((f) => ({ m: memberOf(f.a), at: f.at }))
        .filter((x): x is { m: LMember; at: string } => !!x.m)
        .map((x) => ({ ...liteOf(x.m), at: x.at }));
    },
    async answerRequest(id, accept) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      const fs = follows();
      write(K.follows, accept ? fs.map((f) => (f.a === id && f.b === u.id ? { ...f, status: "accepted" as const } : f)) : fs.filter((f) => !(f.a === id && f.b === u.id)));
      write(K.notes, read<LNote[]>(K.notes, []).filter((n) => !(n.to === u.id && n.actorId === id && n.kind === "request")));
      if (accept) notifyLocal(id, u.id, "accepted", {});
    },
    async removeFollower(id) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      write(K.follows, follows().filter((f) => !(f.a === id && f.b === u.id)));
    },
    async block(id, on) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      const bs = blocks().filter((b) => !(b.a === u.id && b.b === id));
      write(K.blocks, on ? [...bs, { a: u.id, b: id }] : bs);
      if (on) {
        write(K.follows, follows().filter((f) => !((f.a === u.id && f.b === id) || (f.a === id && f.b === u.id))));
        write(K.notes, read<LNote[]>(K.notes, []).filter((n) => !((n.to === u.id && n.actorId === id) || (n.to === id && n.actorId === u.id))));
      }
    },
    async mute(id, on) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      const ms = mutes().filter((x) => !(x.a === u.id && x.b === id));
      write(K.mutes, on ? [...ms, { a: u.id, b: id }] : ms);
    },
    async blocked() {
      const u = current();
      if (!u) return [];
      return blocks().filter((b) => b.a === u.id).map((b) => memberOf(b.b)).filter((m): m is LMember => !!m).map(liteOf);
    },
    async reportMember(id, reason, note) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      write(K.memberReports, [...read<unknown[]>(K.memberReports, []), { id, by: u.id, reason, note, at: new Date().toISOString() }]);
    },
    async searchMembers(q) {
      const meId = current()?.id ?? null;
      const t = q.toLowerCase().replace(/^@/, "").trim();
      if (t.length < 2) return [];
      const fs = follows();
      return members()
        .filter((m) => m.id !== meId && (m.inSearch || fs.some((f) => f.a === meId && f.b === m.id)) && !(meId && blockedWith(meId, m.id)))
        .filter((m) => m.handle.startsWith(t) || m.name.toLowerCase().includes(t))
        .map((m) => personOf(m, meId))
        .sort((a, b) => Number(b.handle === t) - Number(a.handle === t) || Number(b.iFollow !== "none") - Number(a.iFollow !== "none") || Number(b.followsMe) - Number(a.followsMe) || a.handle.localeCompare(b.handle))
        .slice(0, 20);
    },
    async suggestedMembers() {
      const meId = current()?.id ?? null;
      const fs = follows();
      const mine = new Set(fs.filter((f) => f.a === meId).map((f) => f.b));
      const reviews = read<Review[]>(K.reviews, []);
      const out: Person[] = [];
      const seen = new Set<string>();
      const add = (m: LMember | null, reason: string) => {
        if (!m || m.id === meId || mine.has(m.id) || seen.has(m.id) || !m.inSearch || (meId && blockedWith(meId, m.id))) return;
        seen.add(m.id);
        out.push({ ...personOf(m, meId), reason });
      };
      for (const f of fs) if (f.b === meId && f.status === "accepted") add(memberOf(f.a), "Follows you");
      for (const f of fs) if (mine.has(f.a) && f.status === "accepted") add(memberOf(f.b), `Followed by ${memberOf(f.a)?.name ?? "someone"}`);
      for (const m of members()) if (m.role === "editor") add(m, "Local editor");
      for (const m of members()) {
        const n = reviews.filter((r) => r.userId === m.id).length;
        if (n) add(m, n === 1 ? "1 review" : `${n} reviews`);
      }
      return out.slice(0, 12);
    },
    async feed(scope, before) {
      const meId = current()?.id ?? null;
      const all: Activity[] = [];
      const reviews = read<Review[]>(K.reviews, []);
      const fs = follows();
      const actors =
        scope === "everyone"
          ? members().filter((m) => canView(meId, m.id))
          : fs.filter((f) => f.a === meId && f.status === "accepted").map((f) => memberOf(f.b)).filter((m): m is LMember => !!m);
      for (const m of actors) {
        if (meId && (blockedWith(meId, m.id) || mutes().some((x) => x.a === meId && x.b === m.id))) continue;
        const actor = liteOf(m);
        for (const r of reviews.filter((x) => x.userId === m.id && x.status !== "held"))
          all.push({ id: numId(`r${r.id}`), kind: "review", spotId: r.spotId, reviewId: r.id, at: r.createdAt, actor });
        if (scope === "everyone") continue;
        for (const p of placesOf(m.id)) {
          if (p.at && m.shareVisits) all.push({ id: numId(`b${m.id}${p.spotId}`), kind: "been", spotId: p.spotId, verdict: p.verdict, at: p.at, actor });
          if (p.saved && p.savedOn && m.shareSaved) all.push({ id: numId(`s${m.id}${p.spotId}`), kind: "save", spotId: p.spotId, at: p.savedOn, actor });
        }
        for (const f of fs.filter((x) => x.a === m.id && x.status === "accepted")) {
          const t = memberOf(f.b);
          if (t && !(meId && blockedWith(meId, t.id))) all.push({ id: numId(`f${f.a}${f.b}`), kind: "follow", at: f.at, actor, target: liteOf(t) });
        }
      }
      const sorted = all
        .filter((a) => +new Date(a.at) <= Date.now() + 60e3)
        .sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id)
        .filter((a) => !before || a.at < before.at || (a.at === before.at && a.id < before.id))
        .slice(0, 40);
      const byId: Record<string, Review> = {};
      for (const r of decorateLocal(reviews.filter((r) => sorted.some((a) => a.reviewId === r.id)))) byId[r.id] = r;
      return { items: sorted, reviews: byId };
    },
    async friendsAt(spotIds) {
      const meId = current()?.id;
      if (!meId) return [];
      const ids = new Set(spotIds);
      const out: FriendAt[] = [];
      for (const f of follows().filter((x) => x.a === meId && x.status === "accepted")) {
        const m = memberOf(f.b);
        if (!m || blockedWith(meId, m.id)) continue;
        for (const spotId of ids) {
          const p = placesOf(m.id).find((x) => x.spotId === spotId);
          const r = read<Review[]>(K.reviews, []).find((x) => x.userId === m.id && x.spotId === spotId && x.status !== "held");
          const been = p?.at && m.shareVisits ? p : undefined;
          const saved = !!p?.saved && m.shareSaved;
          if (!been && !r && !saved) continue;
          out.push({ member: liteOf(m), spotId, rating: r?.rating, verdict: been?.verdict, reviewId: r?.id, saved });
        }
      }
      return out;
    },
    async react(reviewId, kind, on) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      const r = read<Review[]>(K.reviews, []).find((x) => x.id === reviewId);
      if (r?.userId === u.id) throw new Error("That's your own review.");
      const all = reactions();
      const cur = new Set(all[reviewId]?.[kind] ?? []);
      const had = cur.has(u.id);
      if (on) cur.add(u.id);
      else cur.delete(u.id);
      write(K.reactions, { ...all, [reviewId]: { ...(all[reviewId] ?? {}), [kind]: [...cur] } });
      if (kind === "helpful") write(K.votes, { ...read<Record<string, string[]>>(K.votes, {}), [reviewId]: [...cur] });
      if (r && on && !had) notifyLocal(r.userId, u.id, "reaction", { reviewId, spotId: r.spotId, detail: kind });
    },
    async listComments(reviewId) {
      const meId = current()?.id ?? null;
      const writer = read<Review[]>(K.reviews, []).find((r) => r.id === reviewId)?.userId;
      return read<LComment[]>(K.comments, [])
        .filter((c) => c.reviewId === reviewId)
        .filter((c) => c.status === "live" || c.status === "deleted" || c.userId === meId || (c.status === "hidden" && writer === meId))
        .filter((c) => !(meId && blockedWith(meId, c.userId)))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(commentOf);
    },
    async addComment(reviewId, body, parentId) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      ensureMe();
      const text = body.replace(/\s+/g, " ").trim();
      if (text.length < 1 || text.length > 500) throw new Error("Comments are 1 to 500 characters.");
      if (hasBannedWord(text)) throw new Error(BANNED_MESSAGE);
      const r = read<Review[]>(K.reviews, []).find((x) => x.id === reviewId);
      if (!r || r.status === "held") throw new Error("That review isn't taking comments.");
      const writer = memberOf(r.userId);
      if (r.userId !== u.id) {
        if (blockedWith(u.id, r.userId)) throw new Error("You can't comment on this review.");
        if (writer?.comments === "off") throw new Error("Comments are off for this review.");
        if (writer?.comments === "following" && !follows().some((f) => f.a === r.userId && f.b === u.id && f.status === "accepted"))
          throw new Error(`Only people ${writer.name} follows can comment on this review.`);
      }
      const all = read<LComment[]>(K.comments, []);
      let parent = parentId ? all.find((c) => c.id === parentId) : undefined;
      if (parentId && (!parent || parent.reviewId !== reviewId)) throw new Error("That comment isn't there anymore.");
      // one level of replies: answering a reply joins the thread it's in
      if (parent?.parentId) parent = all.find((c) => c.id === parent!.parentId);
      const c: LComment = { id: uid(), reviewId, parentId: parent?.id, userId: u.id, body: text, status: "live", createdAt: new Date().toISOString() };
      write(K.comments, [...all, c]);
      const told = new Set([u.id]);
      if (parentId) {
        const pa = all.find((x) => x.id === parentId)?.userId;
        if (pa && !told.has(pa)) (notifyLocal(pa, u.id, "reply", { reviewId, commentId: c.id, spotId: r.spotId, detail: text.slice(0, 140) }), told.add(pa));
      }
      if (!told.has(r.userId)) (notifyLocal(r.userId, u.id, "comment", { reviewId, commentId: c.id, spotId: r.spotId, detail: text.slice(0, 140) }), told.add(r.userId));
      for (const m of [...text.matchAll(/@([A-Za-z][A-Za-z0-9_]{2,19})/g)].slice(0, 2)) {
        const who = members().find((x) => x.handle === m[1].toLowerCase());
        if (who && !told.has(who.id)) (notifyLocal(who.id, u.id, "mention", { reviewId, commentId: c.id, spotId: r.spotId, detail: text.slice(0, 140) }), told.add(who.id));
      }
      return commentOf(c);
    },
    async editComment(id, body) {
      const u = current();
      const all = read<LComment[]>(K.comments, []);
      const c = all.find((x) => x.id === id);
      if (!c || c.userId !== u?.id || c.status !== "live") throw new Error("That comment can't be edited.");
      if (Date.now() - +new Date(c.createdAt) > 15 * 60e3) throw new Error("Comments can be edited for 15 minutes after posting.");
      const text = body.replace(/\s+/g, " ").trim();
      if (text.length < 1 || text.length > 500) throw new Error("Comments are 1 to 500 characters.");
      if (hasBannedWord(text)) throw new Error(BANNED_MESSAGE);
      const next = { ...c, body: text, editedAt: new Date().toISOString() };
      write(K.comments, all.map((x) => (x.id === id ? next : x)));
      return commentOf(next);
    },
    async deleteComment(id) {
      const u = current();
      const all = read<LComment[]>(K.comments, []);
      const c = all.find((x) => x.id === id);
      if (!c) return;
      const writer = read<Review[]>(K.reviews, []).find((r) => r.id === c.reviewId)?.userId;
      if (c.userId !== u?.id && writer !== u?.id) throw new Error("That isn't yours to delete.");
      const hasReplies = all.some((x) => x.parentId === id && x.status !== "deleted");
      let next = hasReplies ? all.map((x) => (x.id === id ? { ...x, status: "deleted" as const, body: null } : x)) : all.filter((x) => x.id !== id);
      // the last reply gone takes its placeholder with it
      if (!hasReplies && c.parentId) {
        const p = next.find((x) => x.id === c.parentId);
        if (p?.status === "deleted" && !next.some((x) => x.parentId === p.id)) next = next.filter((x) => x.id !== p.id);
      }
      write(K.comments, next);
    },
    async hideComment(id, hidden) {
      const u = current();
      const all = read<LComment[]>(K.comments, []);
      const c = all.find((x) => x.id === id);
      const writer = c && read<Review[]>(K.reviews, []).find((r) => r.id === c.reviewId)?.userId;
      if (!c || writer !== u?.id) throw new Error("Only the review's writer can do that.");
      write(K.comments, all.map((x) => (x.id === id ? { ...x, status: hidden ? ("hidden" as const) : ("live" as const) } : x)));
    },
    async reportComment(id, reason) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      write(K.commentReports, [...read<unknown[]>(K.commentReports, []), { id, by: u.id, reason, at: new Date().toISOString() }]);
    },
    async notes() {
      const u = current();
      if (!u) return [];
      return read<LNote[]>(K.notes, [])
        .filter((n) => n.to === u.id)
        .sort((a, b) => b.at.localeCompare(a.at))
        .map(({ to: _to, actorId, ...n }) => {
          const a = actorId ? memberOf(actorId) : null;
          return { ...n, ...(a ? { actor: liteOf(a) } : {}) };
        });
    },
    async unread() {
      const u = current();
      return u ? read<LNote[]>(K.notes, []).filter((n) => n.to === u.id && !n.read).length : 0;
    },
    async markRead() {
      const u = current();
      if (u) write(K.notes, read<LNote[]>(K.notes, []).map((n) => (n.to === u.id ? { ...n, read: true } : n)));
    },
    async sendGiftNote(toId, spotId, note) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      const fs = follows();
      if (!(fs.some((f) => f.a === u.id && f.b === toId && f.status === "accepted") && fs.some((f) => f.a === toId && f.b === u.id && f.status === "accepted")))
        throw new Error("Gift notes go to friends: people you follow who follow you back.");
      notifyLocal(toId, u.id, "gift", { spotId, detail: note.replace(/\s+/g, " ").trim().slice(0, 200) || undefined });
    },
    async savePushToken() {
      /* the demo has no server to send notifications from */
    },
    async getUser() {
      return current();
    },
    onAuth(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    // Preview mode has no mail server, so "continue with email" signs in on this device at once.
    async sendCode(email) {
      const e = email.trim().toLowerCase();
      if (!EMAIL_RE.test(e)) throw new Error("That email doesn't look right.");
      const users = read<StoredUser[]>(K.users, []);
      let u = users.find((x) => x.email === e);
      const isNew = !u;
      if (!u) {
        u = { id: uid(), name: "", email: e };
        write(K.users, [...users, u]);
      }
      const pub: User = { id: u.id, name: u.name || nameFromEmail(e) || "Local", email: e, home: u.home, needsName: !u.name, isNew };
      write(K.session, pub);
      emit();
      return { instant: pub };
    },
    async verifyCode() {
      throw new Error("Preview mode signs you in without a code.");
    },
    googleClientId: null,
    async signInWithGoogleToken() {
      throw new Error("Google sign-in needs the live database.");
    },
    async signInWithGoogleRedirect() {
      throw new Error("Google sign-in needs the live database.");
    },
    canUsePasskeys: () => false,
    async signInWithPasskey() {
      return null;
    },
    async registerPasskey() {
      throw new Error("Passkeys need the live database.");
    },
    async passkeyCount() {
      return 0;
    },
    async signOut() {
      signOutLocal();
    },
    async deleteAccount() {
      const u = current();
      if (!u) return;
      write(K.users, read<StoredUser[]>(K.users, []).filter((x) => x.id !== u.id));
      write(K.reviews, read<Review[]>(K.reviews, []).filter((r) => r.userId !== u.id));
      write(K.photos, read<Photo[]>(K.photos, []).filter((p) => p.userId !== u.id));
      write(K.submissions, read<Submission[]>(K.submissions, []).filter((x) => x.submittedBy !== u.id));
      // and everything friends-side, like the database's cascade
      write(K.members, members().filter((m) => m.id !== u.id));
      write(K.follows, follows().filter((f) => f.a !== u.id && f.b !== u.id));
      write(K.blocks, blocks().filter((b) => b.a !== u.id && b.b !== u.id));
      write(K.mutes, mutes().filter((b) => b.a !== u.id && b.b !== u.id));
      write(K.comments, read<LComment[]>(K.comments, []).filter((c) => c.userId !== u.id));
      write(K.notes, read<LNote[]>(K.notes, []).filter((n) => n.to !== u.id && n.actorId !== u.id));
      write(K.reactions, Object.fromEntries(Object.entries(reactions()).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([kk, who]) => [kk, (who ?? []).filter((x) => x !== u.id)]))])));
      signOutLocal();
    },
    // lists already live on this device in preview mode
    async pullLists() {
      return { saved: [], been: {} };
    },
    async putSaved() {},
    async putStamp() {},
    async pushLists() {},
    async listReviews(spotIds) {
      const ids = new Set(Array.isArray(spotIds) ? spotIds : [spotIds]);
      return decorateLocal(read<Review[]>(K.reviews, []).filter((r) => ids.has(r.spotId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    async addReview(spotId, i) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      const all = read<Review[]>(K.reviews, []);
      const prev = all.find((x) => x.spotId === spotId && x.userId === u.id);
      const today = all.filter((x) => x.userId === u.id && x.id !== prev?.id && Date.now() - +new Date(x.createdAt) < 86400e3).length;
      if (!prev && today >= DAILY_MAX) throw new Error(`That's ${DAILY_MAX} reviews today. Come back tomorrow for more.`);
      if (hasBannedWord(`${i.body} ${i.ordered.join(" ")}`)) throw new Error(BANNED_MESSAGE);
      const now = new Date().toISOString();
      const r: Review = {
        id: prev?.id ?? uid(), spotId, userId: u.id, userName: u.name, rating: i.rating, body: i.body,
        createdAt: prev?.createdAt ?? now, updatedAt: prev ? now : undefined,
        goBack: i.goBack, visited: i.visited, ordered: i.ordered, goodFor: i.goodFor, sub: i.sub, status: "live",
      };
      // one review per member per spot (mirrors the DB unique constraint)
      write(K.reviews, [r, ...all.filter((x) => x.id !== r.id)]);
      return { ...r, helpful: read<Record<string, string[]>>(K.votes, {})[r.id]?.length ?? 0 };
    },
    async voteHelpful(reviewId, on) {
      return this.react(reviewId, "helpful", on);
    },
    async reportReview(reviewId, reason, note) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      write(K.reports, [...read<unknown[]>(K.reports, []), { reviewId, userId: u.id, reason, note, at: new Date().toISOString() }]);
    },
    async deleteReview(id) {
      const u = current();
      write(K.reviews, read<Review[]>(K.reviews, []).filter((r) => !(r.id === id && r.userId === u?.id)));
    },
    async listPhotos(spotId) {
      return read<Photo[]>(K.photos, []).filter((p) => p.spotId === spotId);
    },
    async addPhoto(spotId, file, kind, caption) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      if (caption && hasBannedWord(caption)) throw new Error(BANNED_MESSAGE);
      const blob = await resizeImage(file, 1000, 0.72);
      const p: Photo = { id: uid(), spotId, userId: u.id, userName: u.name, url: await blobToDataUrl(blob), kind, caption, createdAt: new Date().toISOString() };
      write(K.photos, [p, ...read<Photo[]>(K.photos, [])]);
      return p;
    },
    async ratings() {
      const by = new Map<string, Review[]>();
      for (const r of read<Review[]>(K.reviews, [])) by.set(r.spotId, [...(by.get(r.spotId) ?? []), r]);
      return foldAliases(
        [...by.entries()].map(([id, list]) => {
          const asked = list.filter((r) => typeof r.goBack === "boolean");
          return {
            id,
            avg: list.reduce((a, r) => a + r.rating, 0) / list.length,
            count: list.length,
            goBack: asked.length ? Math.round((100 * asked.filter((r) => r.goBack).length) / asked.length) : null,
          };
        })
      );
    },
    async subscribe(email) {
      write(K.subs, Array.from(new Set([...read<string[]>(K.subs, []), email])));
    },
    async lead(l) {
      write(K.leads, [...read<Lead[]>(K.leads, []), { ...l, at: new Date().toISOString() }]);
    },
    async myReviews() {
      const u = current();
      return u ? decorateLocal(read<Review[]>(K.reviews, []).filter((r) => r.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))) : [];
    },
    async myPhotos() {
      const u = current();
      return u ? read<Photo[]>(K.photos, []).filter((p) => p.userId === u.id) : [];
    },
    async updateName(name) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      const clean = name.trim().slice(0, 40) || u.name;
      write(K.users, read<(User & { hash: string })[]>(K.users, []).map((x) => (x.id === u.id ? { ...x, name: clean } : x)));
      write(K.reviews, read<Review[]>(K.reviews, []).map((r) => (r.userId === u.id ? { ...r, userName: clean } : r)));
      const next = { ...u, name: clean, needsName: false };
      write(K.session, next);
      emit();
      return next;
    },
    async updateHome(home) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      write(K.users, read<StoredUser[]>(K.users, []).map((x) => (x.id === u.id ? { ...x, home } : x)));
      const next = { ...u, home };
      write(K.session, next);
      emit();
      return next;
    },
    async waitlist(email, state, city) {
      write(K.waitlist, [...read<unknown[]>(K.waitlist, []), { email, state, city, at: new Date().toISOString() }]);
    },
    async listSpots(cityId) {
      return read<Spot[]>(K.spots, [])
        .filter((s) => s.city === cityId)
        .map((s) => ({ ...s, genres: cleanGenres(s.genres) }));
    },
    async getSpot(id) {
      const s = read<Spot[]>(K.spots, []).find((x) => x.id === id);
      return s ? { ...s, genres: cleanGenres(s.genres) } : null;
    },
    async submitSpot(input, note, photo) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      const all = read<Submission[]>(K.submissions, []);
      if (all.filter((x) => x.submittedBy === u.id && x.status === "pending").length >= 10)
        throw new Error("You have 10 spots waiting for review — hang tight while we verify those first.");
      const photoUrl = photo ? await blobToDataUrl(await resizeImage(photo, 900, 0.72)) : undefined;
      const sub: Submission = { ...input, id: uid(), status: "pending", submittedBy: u.id, submitterName: u.name, note, photoUrl, createdAt: new Date().toISOString() };
      write(K.submissions, [sub, ...all]);
      return sub;
    },
    async mySubmissions() {
      const u = current();
      return u ? read<Submission[]>(K.submissions, []).filter((x) => x.submittedBy === u.id).map((x) => ({ ...x, genres: cleanGenres(x.genres) })) : [];
    },
    async isAdmin() {
      const u = current();
      if (!u) return false;
      return ADMIN_EMAILS.length ? ADMIN_EMAILS.includes(u.email) : true; // demo: every member can moderate
    },
    async listSubmissions(status) {
      const list = read<Submission[]>(K.submissions, [])
        .filter((x) => x.status === status)
        .map((x) => ({ ...x, genres: cleanGenres(x.genres) }));
      return status === "pending" ? list.reverse() : list;
    },
    async approveSubmission(sub, edits) {
      const reviewedAt = new Date().toISOString();
      const spot = spotFrom(sub, edits, newSpotId(edits.name), reviewedAt);
      write(K.spots, [...read<Spot[]>(K.spots, []), spot]);
      write(
        K.submissions,
        read<Submission[]>(K.submissions, []).map((x) => (x.id === sub.id ? { ...x, status: "approved", spotId: spot.id, reviewedAt } : x))
      );
      if (sub.photoUrl) {
        const p: Photo = { id: uid(), spotId: spot.id, userId: sub.submittedBy, userName: sub.submitterName, url: sub.photoUrl, kind: "building", createdAt: reviewedAt };
        write(K.photos, [p, ...read<Photo[]>(K.photos, [])]);
      }
      return spot;
    },
    async rejectSubmission(id, reason) {
      write(
        K.submissions,
        read<Submission[]>(K.submissions, []).map((x) => (x.id === id ? { ...x, status: "rejected", rejectReason: reason, reviewedAt: new Date().toISOString() } : x))
      );
    },
  };
}

let instance: Backend | null = null;
export function getBackend(): Backend {
  if (instance) return instance;
  instance = hasSupabase
    ? supabaseBackend(
        createClient(SUPABASE_URL, SUPABASE_KEY, {
          // implicit flow: an emailed sign-in link works even when it opens in a different browser than the one that asked
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: "implicit",
            // in the iPhone app the session lives in the app's own storage, which iOS doesn't clear
            ...(isNativeApp() ? { storage: nativeAuthStorage } : {}),
          },
        })
      )
    : localBackend();
  return instance;
}
