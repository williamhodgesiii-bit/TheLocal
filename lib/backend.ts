"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resizeImage } from "./image";

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

  return {
    mode: "supabase",
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

const K = { users: "tl.users", session: "tl.session", reviews: "tl.reviews", photos: "tl.photos", subs: "tl.subs", leads: "tl.leads" };

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
