"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Mail, Save } from "lucide-react";
import { SPOTS, SPOT_BY_ID, areaLabelOf, priceLabel, type Spot } from "@/lib/data";
import type { LetterWeek } from "@/lib/backend";
import { NEWSLETTER } from "@/lib/brand";
import { DEFAULT_CITY } from "@/lib/regions";
import { SLOTS, addWeeks, fitsSlot, letterFor, thursdayOf, weekLabel, type Slot } from "@/lib/letter";
import { useApp } from "./Providers";

type Status = { ready?: boolean; missing?: string[]; people?: number | null };

/**
 * The desk's Letter tab: The Thursday Plate for this week and the next two. Each week has its
 * three picked already; swap any, add a line about one (it replaces our description), write a
 * note for the top, or skip the week. It goes out Thursday around 8 a.m.; the team gets a copy
 * on Tuesday.
 */
export default function DeskLetter() {
  const { backend } = useApp();
  const [status, setStatus] = useState<Status | null>(null);
  const [community, setCommunity] = useState<Spot[]>([]);
  const now = thursdayOf(new Date());
  const weeks = [now, addWeeks(now, 1), addWeeks(now, 2)];

  useEffect(() => {
    backend.letterDesk().then(setStatus).catch(() => setStatus({ ready: false, missing: ["the server"] }));
    backend.listSpots(DEFAULT_CITY).then((l) => setCommunity(l.filter((s) => !SPOT_BY_ID[s.id]))).catch(() => {});
  }, [backend]);
  const pool = useMemo(() => [...SPOTS, ...community].sort((a, b) => a.name.localeCompare(b.name)), [community]);

  return (
    <>
      <p className="desk-line">
        {status === null
          ? "Checking…"
          : status.ready
            ? `${NEWSLETTER} goes out Thursdays around 8 a.m. to ${status.people ?? 0} ${status.people === 1 ? "person" : "people"}. You get a copy on Tuesday.`
            : `${NEWSLETTER} isn't sending yet. It needs ${status.missing?.join(", ")}.${status.people != null ? ` ${status.people} signed up so far.` : ""}`}
      </p>
      <div className="admin-list">
        {weeks.map((w, i) => (
          <WeekCard key={w} week={w} label={i === 0 ? "This week" : i === 1 ? "Next week" : "In two weeks"} pool={pool} canTest={!!status?.ready} />
        ))}
      </div>
    </>
  );
}

function WeekCard({ week, label, pool, canTest }: { week: string; label: string; pool: Spot[]; canTest: boolean }) {
  const { backend, toast } = useApp();
  const [row, setRow] = useState<LetterWeek | null | undefined>(undefined);
  const [draft, setDraft] = useState<LetterWeek | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);

  const load = useCallback(() => {
    backend
      .letterWeek(week)
      .then((r) => setRow(r))
      .catch(() => setRow(null));
  }, [backend, week]);
  useEffect(load, [load]);

  // what it would send now: the team's choices, the automatic picks for the rest
  const letter = useMemo(() => letterFor(week, pool, row ?? null), [week, pool, row]);
  useEffect(() => {
    if (row === undefined) return;
    setDraft({
      week,
      fine: letter.picks.fine?.id,
      casual: letter.picks.casual?.id,
      wild: letter.picks.wild?.id,
      notes: { ...letter.notes },
      intro: letter.intro,
      paused: letter.paused,
    });
  }, [row, letter, week]);

  if (!draft) return <article className="review-card letter-card">Loading {weekLabel(week)}…</article>;
  const set = (patch: Partial<LetterWeek>) => setDraft((d) => ({ ...d!, ...patch }));
  const setNote = (slot: Slot, v: string) => setDraft((d) => ({ ...d!, notes: { ...d!.notes, [slot]: v || undefined } }));

  async function save() {
    setBusy("save");
    try {
      await backend.saveLetterWeek(draft!);
      toast(`Saved ${weekLabel(week)}.`, "ok");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't save it.", "err");
    } finally {
      setBusy(null);
    }
  }
  async function test() {
    setBusy("test");
    const r = await backend.letterDesk({ week });
    setBusy(null);
    if (r.ok) toast(`Sent a test to ${r.to}.`, "ok");
    else toast(r.error ?? "Couldn't send it.", "err");
  }

  return (
    <article className={`review-card letter-card ${draft.paused ? "paused" : ""}`}>
      <div className="rc-head">
        <div>
          <span className="mono-sm">
            {label} · {row?.sentAt ? `sent to ${row.sentCount ?? 0} on ${new Date(row.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "not sent yet"}
          </span>
          <h2 className="display lc-title">{weekLabel(week, { weekday: "long", month: "long", day: "numeric" })}</h2>
        </div>
        <label className="check">
          <input type="checkbox" checked={!!draft.paused} onChange={(e) => set({ paused: e.target.checked })} /> Skip this week
        </label>
      </div>
      <div className="form lc-slots">
        {SLOTS.map((slot) => {
          const id = draft[slot.id];
          const s = id ? pool.find((x) => x.id === id) : undefined;
          return (
            <div key={slot.id} className="lc-slot">
              <label>
                <span>{slot.label}</span>
                <select value={id ?? ""} onChange={(e) => set({ [slot.id]: e.target.value || undefined })}>
                  <optgroup label={`Fits ${slot.label.toLowerCase()}`}>
                    {pool.filter(fitsSlot[slot.id]).map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} · {areaLabelOf(x)} · {priceLabel(x.price)}
                      </option>
                    ))}
                  </optgroup>
                  {slot.id !== "wild" && (
                    <optgroup label="Anything else">
                      {pool
                        .filter((x) => !fitsSlot[slot.id](x))
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} · {areaLabelOf(x)} · {priceLabel(x.price)}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </label>
              <label>
                <span>Your line about it (optional)</span>
                <textarea rows={2} maxLength={400} value={draft.notes[slot.id] ?? ""} placeholder={s?.blurb ?? ""} onChange={(e) => setNote(slot.id, e.target.value)} />
              </label>
            </div>
          );
        })}
        <label>
          <span>A note at the top (optional)</span>
          <textarea rows={2} maxLength={600} value={draft.intro ?? ""} placeholder="Anything to say before the picks: a closing, an opening, the weather." onChange={(e) => set({ intro: e.target.value || undefined })} />
        </label>
      </div>
      <div className="rc-actions lc-actions">
        <button className="btn btn-rust" onClick={save} disabled={busy !== null}>
          {busy === "save" ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save {weekLabel(week)}
        </button>
        <div className="row gap6 wrap">
          <a className="btn btn-ghost btn-sm" href={`/api/letter?week=${week}`} target="_blank" rel="noreferrer">
            <Eye size={14} /> See the email
          </a>
          <button className="btn btn-ghost btn-sm" onClick={test} disabled={busy !== null || !canTest} title={canTest ? "Sends this week's email to you" : "Needs the email service set up first"}>
            {busy === "test" ? <Loader2 size={14} className="spin" /> : <Mail size={14} />} Send me a test
          </button>
        </div>
      </div>
      <p className="mono-sm">Save first: the email and the front page show what&apos;s saved.</p>
    </article>
  );
}
