"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resizeImage } from "./image";
import { slugify, type DrinkKind, type GenreId, type Spot } from "./data";

export type User = { id: string; name: string; email: string };
export type Review = {
  id: string;
  spotId: string;
  userId: string;
  userName: string;
  rating: number;
  body: string;
  createdAt: string;
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
export type RatingSummary = Record<string, { avg: number; count: number }>;
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
  signUp(name: string, email: string, password: string): Promise<User>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  listReviews(spotId: string): Promise<Review[]>;
  addReview(spotId: string, rating: number, body: string): Promise<Review>;
  deleteReview(id: string): Promise<void>;
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

  /* community spots */
  listSpots(cityId: string): Promise<Spot[]>;
  getSpot(id: string): Promise<Spot | null>;
  submitSpot(input: SpotInput, note?: string, photo?: File): Promise<Submission>;
  mySubmissions(): Promise<Submission[]>;

  /* moderation */
  isAdmin(): Promise<boolean>;
  listSubmissions(status: SubmissionStatus): Promise<Submission[]>;
  approveSubmission(sub: Submission, edits: SpotInput & { pop: number }, checklist: Checklist): Promise<Spot>;
  rejectSubmission(id: string, reason: string): Promise<void>;
}

const newSpotId = (name: string) => `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;

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
  const toUser = (u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null | undefined): User | null =>
    u ? { id: u.id, email: u.email ?? "", name: (u.user_metadata?.display_name as string) || (u.email ?? "Local").split("@")[0] } : null;

  const mapReview = (r: Record<string, any>): Review => ({
    id: r.id, spotId: r.spot_id, userId: r.user_id, userName: r.display_name, rating: r.rating, body: r.body, createdAt: r.created_at,
  });
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
    genres: r.genres ?? [], drinks: r.drinks ?? [], price: r.price, knownFor: r.known_for, blurb: r.blurb, website: r.website ?? undefined,
    phone: r.phone ?? undefined, tags: r.tags ?? [], status: r.status, submittedBy: r.submitted_by, submitterName: r.submitter_name,
    note: r.note ?? undefined, photoUrl: r.photo_url ?? undefined, rejectReason: r.reject_reason ?? undefined, reviewedAt: r.reviewed_at ?? undefined,
    spotId: r.spot_id ?? undefined, createdAt: r.created_at,
  });
  const mapSpot = (r: Record<string, any>): Spot => ({
    id: r.id, city: r.city_id, name: r.name, genres: r.genres ?? [], drinks: r.drinks?.length ? r.drinks : undefined, area: r.area,
    areaLabel: r.area_label ?? undefined, address: r.address, coords: [r.lat, r.lng], price: r.price, knownFor: r.known_for, blurb: r.blurb,
    tags: r.tags ?? [], pop: r.pop ?? 60, sponsored: r.sponsored ?? false, website: r.website ?? undefined, phone: r.phone ?? undefined,
    addedBy: r.added_by ?? undefined, verifiedAt: r.verified_at ?? undefined,
  });
  const inputRow = (i: SpotInput) => ({
    city_id: i.cityId, name: i.name, address: i.address, area: i.area, area_label: i.areaLabel, lat: i.coords[0], lng: i.coords[1],
    genres: i.genres, drinks: i.drinks, price: i.price, known_for: i.knownFor, blurb: i.blurb, website: i.website || null,
    phone: i.phone || null, tags: i.tags,
  });

  return {
    mode: "supabase",
    async myReviews() {
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return [];
      const { data } = await sb.from("reviews").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false });
      return (data ?? []).map(mapReview);
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
    async signUp(name, email, password) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name } } });
      if (error) throw error;
      if (!data.session) throw new Error("Check your inbox to confirm your email, then sign in.");
      return toUser(data.user)!;
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return toUser(data.user)!;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async listReviews(spotId) {
      const { data, error } = await sb.from("reviews").select("*").eq("spot_id", spotId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapReview);
    },
    async addReview(spotId, rating, body) {
      const u = await requireUser();
      const { data, error } = await sb
        .from("reviews")
        .upsert({ spot_id: spotId, user_id: u.id, display_name: u.name, rating, body }, { onConflict: "spot_id,user_id" })
        .select()
        .single();
      if (error) throw error;
      return mapReview(data);
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
      return Object.fromEntries((data ?? []).map((r: any) => [r.spot_id, { avg: Number(r.avg_rating), count: Number(r.review_count) }]));
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
  submissions: "tl.submissions", spots: "tl.spots", waitlist: "tl.waitlist",
};
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

async function sha(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
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
  type StoredUser = User & { hash: string };

  return {
    mode: "local",
    async getUser() {
      return current();
    },
    onAuth(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signUp(name, email, password) {
      const users = read<StoredUser[]>(K.users, []);
      const e = email.trim().toLowerCase();
      if (users.some((u) => u.email === e)) throw new Error("That email already has an account. Sign in instead.");
      if (password.length < 6) throw new Error("Use at least 6 characters for your password.");
      const u: StoredUser = { id: uid(), name: name.trim() || e.split("@")[0], email: e, hash: await sha(e + password) };
      write(K.users, [...users, u]);
      const pub = { id: u.id, name: u.name, email: u.email };
      write(K.session, pub);
      emit();
      return pub;
    },
    async signIn(email, password) {
      const e = email.trim().toLowerCase();
      const u = read<StoredUser[]>(K.users, []).find((x) => x.email === e);
      if (!u || u.hash !== (await sha(e + password))) throw new Error("Email or password doesn't match.");
      const pub = { id: u.id, name: u.name, email: u.email };
      write(K.session, pub);
      emit();
      return pub;
    },
    async signOut() {
      localStorage.removeItem(K.session);
      emit();
    },
    async listReviews(spotId) {
      return read<Review[]>(K.reviews, []).filter((r) => r.spotId === spotId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async addReview(spotId, rating, body) {
      const u = current();
      if (!u) throw new Error("Sign in first.");
      const r: Review = { id: uid(), spotId, userId: u.id, userName: u.name, rating, body, createdAt: new Date().toISOString() };
      // one review per member per spot (mirrors the DB unique constraint)
      write(K.reviews, [r, ...read<Review[]>(K.reviews, []).filter((x) => !(x.spotId === spotId && x.userId === u.id))]);
      return r;
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
      const blob = await resizeImage(file, 1000, 0.72);
      const p: Photo = { id: uid(), spotId, userId: u.id, userName: u.name, url: await blobToDataUrl(blob), kind, caption, createdAt: new Date().toISOString() };
      write(K.photos, [p, ...read<Photo[]>(K.photos, [])]);
      return p;
    },
    async ratings() {
      const out: RatingSummary = {};
      for (const r of read<Review[]>(K.reviews, [])) {
        const o = (out[r.spotId] ||= { avg: 0, count: 0 });
        o.avg = (o.avg * o.count + r.rating) / (o.count + 1);
        o.count++;
      }
      return out;
    },
    async subscribe(email) {
      write(K.subs, Array.from(new Set([...read<string[]>(K.subs, []), email])));
    },
    async lead(l) {
      write(K.leads, [...read<Lead[]>(K.leads, []), { ...l, at: new Date().toISOString() }]);
    },
    async myReviews() {
      const u = current();
      return u ? read<Review[]>(K.reviews, []).filter((r) => r.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
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
      const next = { ...u, name: clean };
      write(K.session, next);
      emit();
      return next;
    },
    async waitlist(email, state, city) {
      write(K.waitlist, [...read<unknown[]>(K.waitlist, []), { email, state, city, at: new Date().toISOString() }]);
    },
    async listSpots(cityId) {
      return read<Spot[]>(K.spots, []).filter((s) => s.city === cityId);
    },
    async getSpot(id) {
      return read<Spot[]>(K.spots, []).find((s) => s.id === id) ?? null;
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
      return u ? read<Submission[]>(K.submissions, []).filter((x) => x.submittedBy === u.id) : [];
    },
    async isAdmin() {
      const u = current();
      if (!u) return false;
      return ADMIN_EMAILS.length ? ADMIN_EMAILS.includes(u.email) : true; // demo: every member can moderate
    },
    async listSubmissions(status) {
      const list = read<Submission[]>(K.submissions, []).filter((x) => x.status === status);
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  instance = url && key ? supabaseBackend(createClient(url, key)) : localBackend();
  return instance;
}
