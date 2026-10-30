"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { SPOT_BY_ID } from "@/lib/data";
import type { Photo } from "@/lib/backend";
import { useApp } from "./Providers";

/**
 * The desk's Photos tab: every photo members add, newest first. Take down one that shouldn't be
 * up, or feature one so it's the picture for that place (in lists, and first on its page). One
 * featured photo per place: featuring another swaps it.
 */
export default function DeskPhotos() {
  const { backend, toast, refreshCovers } = useApp();
  const [list, setList] = useState<Photo[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    backend
      .recentPhotos()
      .then(setList)
      .catch(() => setList([]));
  }, [backend]);
  useEffect(load, [load]);

  async function feature(p: Photo) {
    setBusy(p.id);
    try {
      const on = !p.featured;
      if (on) for (const o of list ?? []) if (o.featured && o.spotId === p.spotId && o.id !== p.id) await backend.featurePhoto(o.id, false);
      await backend.featurePhoto(p.id, on);
      setList((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, featured: on } : x.spotId === p.spotId && on ? { ...x, featured: false } : x)));
      refreshCovers();
      toast(on ? `Featured for ${name(p)}.` : "Not featured anymore.", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't change that.", "err");
    } finally {
      setBusy(null);
    }
  }

  async function takeDown(p: Photo) {
    if (!confirm(`Take down ${p.userName}'s photo of ${name(p)}? This can't be undone.`)) return;
    setBusy(p.id);
    try {
      await backend.deletePhoto(p);
      setList((l) => (l ?? []).filter((x) => x.id !== p.id));
      if (p.featured || p.kind === "building") refreshCovers();
      toast("Taken down.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't take it down.", "err");
    } finally {
      setBusy(null);
    }
  }

  if (list === null) return <p className="admin-msg">Loading…</p>;
  if (!list.length) return <p className="admin-msg">No member photos yet.</p>;
  return (
    <>
      <p className="desk-line">Every photo is up as soon as it&apos;s added. Take down any that shouldn&apos;t be, or feature one to make it that place&apos;s picture.</p>
      <ul className="desk-photos">
        {list.map((p) => (
          <li key={p.id} className={p.featured ? "on" : ""}>
            <a href={p.url} target="_blank" rel="noreferrer" className="dp-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${p.userName}'s photo of ${name(p)}`} loading="lazy" />
              {p.featured && <span className="dp-tag">Featured</span>}
            </a>
            <div className="dp-body">
              <Link href={`/spot/${p.spotId}`} className="dp-place">
                {name(p)}
              </Link>
              <span className="mono-sm">
                {p.userName} · {p.reviewId ? "on their review" : p.kind === "building" ? "the front" : p.kind === "vibe" ? "inside" : "the food"} ·{" "}
                {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              {p.caption && <span className="dp-cap">“{p.caption}”</span>}
              <div className="row gap6 wrap">
                <button className={`btn btn-sm ${p.featured ? "btn-ghost" : "btn-ink"}`} onClick={() => feature(p)} disabled={busy === p.id}>
                  <Star size={14} /> {p.featured ? "Unfeature" : "Feature"}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => takeDown(p)} disabled={busy === p.id}>
                  <Trash2 size={14} /> Take down
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

const name = (p: Photo) => SPOT_BY_ID[p.spotId]?.name ?? p.spotId.replace(/-[a-z0-9]{4}$/, "").replace(/-/g, " ");
