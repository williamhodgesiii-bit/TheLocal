"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, Globe, Loader2, Phone, Search, ShieldCheck, ShieldX } from "lucide-react";
import { AREAS, GENRES, GENRE_BY_ID, slugify, type GenreId } from "@/lib/data";
import { looksLikeChain } from "@/lib/chains";
import type { Submission, SubmissionStatus } from "@/lib/backend";
import { CITY_BY_ID, DEFAULT_CITY } from "@/lib/regions";
import { useApp } from "./Providers";

const PinPicker = dynamic(() => import("./PinPicker"), { ssr: false, loading: () => <div className="pin-picker" /> });

const CHECKS = [
  ["exists", "It exists and is open (called, visited, or a current listing)"],
  ["location", "Address and pin are correct"],
  ["independent", "Locally owned, not a chain or fast food"],
  ["content", "Name, description and photo are accurate and appropriate"],
] as const;

const REASONS = ["Chain or fast food", "Permanently closed", "Couldn't verify it exists", "Already listed (duplicate)", "Outside our coverage area", "Inappropriate content"];

export default function AdminQueue() {
  const { backend, user, openAuth } = useApp();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<SubmissionStatus>("pending");
  const [list, setList] = useState<Submission[] | null>(null);
  const [counts, setCounts] = useState<Record<SubmissionStatus, number>>({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    if (!user) return setAllowed(false);
    backend.isAdmin().then(setAllowed).catch(() => setAllowed(false));
  }, [user, backend]);

  const load = useCallback(async () => {
    setList(null);
    const [p, a, r] = await Promise.all((["pending", "approved", "rejected"] as const).map((s) => backend.listSubmissions(s)));
    setCounts({ pending: p.length, approved: a.length, rejected: r.length });
    setList({ pending: p, approved: a, rejected: r }[tab]);
  }, [backend, tab]);

  useEffect(() => {
    if (allowed) load().catch(() => setList([]));
  }, [allowed, load]);

  return (
    <div className="admin">
      <header className="admin-top">
        <Link href="/" className="textbtn">
          ← Back to the map
        </Link>
        <span>
          <span className="brand-script">The Local</span> <span className="cap-kicker" style={{ display: "inline" }}>verification desk</span>
        </span>
      </header>

      {allowed === null ? (
        <p className="admin-msg">Checking access…</p>
      ) : !allowed ? (
        <div className="admin-msg">
          <h1>Staff only</h1>
          <p>{user ? "Your account isn't on the verification team." : "Sign in with a staff account to review submissions."}</p>
          {!user && (
            <button className="btn btn-ember" onClick={() => openAuth("Sign in with your staff account.")}>
              Sign in
            </button>
          )}
        </div>
      ) : (
        <>
          {backend.mode === "local" && (
            <p className="admin-demo">
              Demo mode: submissions live in this browser and every signed-in member can moderate. Connect Supabase and add staff to the <code>admins</code> table for production.
            </p>
          )}
          <div className="admin-tabs">
            {(["pending", "approved", "rejected"] as const).map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                {t === "pending" ? "Needs verification" : t === "approved" ? "Approved" : "Declined"} <span>{counts[t]}</span>
              </button>
            ))}
          </div>
          {list === null ? (
            <p className="admin-msg">Loading…</p>
          ) : list.length === 0 ? (
            <p className="admin-msg">{tab === "pending" ? "Nothing waiting. Check back later." : "Nothing here yet."}</p>
          ) : (
            <div className="admin-list">
              <AnimatePresence>
                {list.map((s) =>
                  tab === "pending" ? <ReviewCard key={s.id} sub={s} onDone={load} /> : <DoneRow key={s.id} sub={s} />
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DoneRow({ sub }: { sub: Submission }) {
  return (
    <motion.div className={`done-row ${sub.status}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {sub.status === "approved" ? <ShieldCheck size={18} /> : <ShieldX size={18} />}
      <div>
        <strong>{sub.name}</strong>
        <span className="mono-sm">
          {CITY_BY_ID[sub.cityId]?.name} · {sub.areaLabel} · by {sub.submitterName} · {sub.reviewedAt ? new Date(sub.reviewedAt).toLocaleDateString() : ""}
        </span>
        {sub.rejectReason && <span className="sub-reason">{sub.rejectReason}</span>}
      </div>
      {sub.spotId && (
        <Link href={`/spot/${sub.spotId}`} className="btn btn-ghost btn-sm">
          View
        </Link>
      )}
    </motion.div>
  );
}

type Lookup = { name: string; address: string; lat: number; lng: number; source: string; status?: string; mapsUri?: string; website?: string };

function ReviewCard({ sub, onDone }: { sub: Submission; onDone: () => void }) {
  const { backend, toast } = useApp();
  const city = CITY_BY_ID[sub.cityId] ?? CITY_BY_ID[DEFAULT_CITY];
  const [name, setName] = useState(sub.name);
  const [address, setAddress] = useState(sub.address);
  const [area, setArea] = useState(sub.area);
  const [areaLabel, setAreaLabel] = useState(sub.areaLabel);
  const [coords, setCoords] = useState<[number, number]>(sub.coords);
  const [genres, setGenres] = useState<GenreId[]>(sub.genres);
  const [price, setPrice] = useState(sub.price);
  const [knownFor, setKnownFor] = useState(sub.knownFor);
  const [blurb, setBlurb] = useState(sub.blurb);
  const [pop, setPop] = useState(60);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState(REASONS[2]);
  const [lookup, setLookup] = useState<Lookup[] | null>(null);
  const [looking, setLooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const chain = looksLikeChain(name);
  const curated = sub.cityId === DEFAULT_CITY ? AREAS : [];
  const allChecked = CHECKS.every(([k]) => checks[k]);

  async function verifyLookup() {
    setLooking(true);
    try {
      const r = await fetch(`/api/geocode?city=${sub.cityId}&q=${encodeURIComponent(`${name}, ${address}`)}`);
      setLookup((await r.json()).results ?? []);
    } catch {
      setLookup([]);
    } finally {
      setLooking(false);
    }
  }

  async function approve() {
    setBusy(true);
    try {
      await backend.approveSubmission(
        sub,
        { cityId: sub.cityId, name: name.trim(), address: address.trim(), area, areaLabel, coords, genres, drinks: genres.includes("drinks") ? sub.drinks : [], price, knownFor, blurb, website: sub.website, phone: sub.phone, tags: sub.tags, pop },
        checks
      );
      toast(`${name} is up on the map.`, "ok");
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't approve", "err");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    try {
      await backend.rejectSubmission(sub.id, reason);
      toast(`Declined ${name}`);
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't decline", "err");
    } finally {
      setBusy(false);
    }
  }

  const q = encodeURIComponent(`${name} ${address} ${city.name} ${city.state}`);

  return (
    <motion.article className="review-card" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}>
      <div className="rc-head">
        <div>
          <span className="mono-sm">
            {city.name}, {city.state} · submitted by <strong>{sub.submitterName}</strong> · {new Date(sub.createdAt).toLocaleString()}
          </span>
          <input className="rc-title display" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {chain && <span className="hit-bad">Matches chain: {chain}</span>}
      </div>

      <div className="rc-grid">
        <div className="form rc-fields">
          <label>
            <span>Address</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <div className="form-grid">
            <label>
              <span>Neighborhood</span>
              <select
                value={curated.some((a) => a.id === area) ? area : "__keep"}
                onChange={(e) => {
                  const a = curated.find((x) => x.id === e.target.value);
                  if (a) {
                    setArea(a.id);
                    setAreaLabel(a.label);
                  }
                }}
              >
                {curated.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
                <option value="__keep">Custom: {areaLabel}</option>
              </select>
            </label>
            <label>
              <span>Custom name</span>
              <input
                value={areaLabel}
                onChange={(e) => {
                  setAreaLabel(e.target.value);
                  setArea(slugify(e.target.value));
                }}
              />
            </label>
          </div>
          <div className="field-label">Genres</div>
          <div className="genres compact">
            {GENRES.map((g) => (
              <button
                type="button"
                key={g.id}
                className={`chip ${genres.includes(g.id) ? "on" : ""}`}
                style={{ ["--c" as string]: g.color }}
                onClick={() => setGenres((x) => (x.includes(g.id) ? x.filter((y) => y !== g.id) : [...x, g.id].slice(0, 3)))}
              >
                {g.short}
              </button>
            ))}
          </div>
          <div className="row gap6 wrap">
            <span className="field-label">Price</span>
            {([1, 2, 3, 4] as const).map((p) => (
              <button type="button" key={p} className={`subchip ${price === p ? "on" : ""}`} onClick={() => setPrice(p)}>
                {"$".repeat(p)}
              </button>
            ))}
          </div>
          <label>
            <span>Known for</span>
            <input value={knownFor} onChange={(e) => setKnownFor(e.target.value)} />
          </label>
          <label>
            <span>Description</span>
            <textarea rows={3} value={blurb} onChange={(e) => setBlurb(e.target.value)} />
          </label>
          <label>
            <span>Popularity (list order & Surprise Me weight): {pop}</span>
            <input type="range" min={30} max={95} value={pop} onChange={(e) => setPop(+e.target.value)} />
          </label>
          {sub.note && <p className="rc-note">“{sub.note}”</p>}
        </div>

        <div className="rc-verify">
          <PinPicker center={coords} value={coords} onChange={setCoords} zoom={16} />
          <div className="rc-tools">
            <button className="btn btn-ink btn-sm" onClick={verifyLookup} disabled={looking}>
              {looking ? <Loader2 size={14} className="spin" /> : <Search size={14} />} Look it up
            </button>
            <a className="btn btn-ghost btn-sm" href={`https://www.google.com/search?q=${q}`} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Google
            </a>
            <a className="btn btn-ghost btn-sm" href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Maps
            </a>
            {sub.website && (
              <a className="btn btn-ghost btn-sm" href={/^https?:/i.test(sub.website) ? sub.website : `https://${sub.website}`} target="_blank" rel="noreferrer nofollow">
                <Globe size={14} /> Site
              </a>
            )}
            {sub.phone && (
              <a className="btn btn-ghost btn-sm" href={`tel:${sub.phone.replace(/[^0-9+]/g, "")}`}>
                <Phone size={14} /> {sub.phone}
              </a>
            )}
          </div>
          {lookup && (
            <div className="hits">
              {lookup.length === 0 && <span className="mono-sm">No listing found. Call or go by.</span>}
              {lookup.map((h, i) => (
                <button key={i} className="hit" onClick={() => setCoords([h.lat, h.lng])} title="Use this location">
                  <span>
                    <strong>{h.name}</strong>
                    <span className="mono-sm">{h.address}</span>
                  </span>
                  {h.status && <span className={h.status === "OPERATIONAL" ? "hit-ok" : "hit-bad"}>{h.status.replace(/_/g, " ").toLowerCase()}</span>}
                </button>
              ))}
            </div>
          )}
          {sub.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="rc-photo" src={sub.photoUrl} alt={`Submitted photo of ${sub.name}`} />
          )}

          <div className="rc-checks">
            {CHECKS.map(([k, label]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={!!checks[k]} onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))} /> {label}
              </label>
            ))}
          </div>
          <div className="rc-actions">
            <button className="btn btn-rust" onClick={approve} disabled={!allChecked || busy || genres.length === 0}>
              <Check size={15} /> Certify &amp; publish
            </button>
            <div className="row gap6">
              <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Decline reason">
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={reject} disabled={busy}>
                Decline
              </button>
            </div>
          </div>
          <span className="mono-sm">{GENRE_BY_ID[genres[0]]?.label ?? "Pick a genre"} · pin {coords[0].toFixed(5)}, {coords[1].toFixed(5)}</span>
        </div>
      </div>
    </motion.article>
  );
}
