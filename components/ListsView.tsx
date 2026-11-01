"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GENRES, TOWNS, areaLabelOf, priceLabel, type Area, type GenreId, type Spot } from "@/lib/data";
import { LIST_TITLE_MAX, LISTS_MAX, PRESETS, VIBES, cleanList, hasRules, newListId, placesIn, rulesLine, type ListRules, type SpinList } from "@/lib/lists";
import { track } from "@/lib/analytics";
import { useApp } from "./Providers";
import { Cover, Poster } from "./Cover";
import { Icon } from "./Icons";
import Sheet from "./Sheet";

const LISTS_WHY = "Sign in to make lists. It takes a few seconds, no password.";

/**
 * Lists: Want to try and Been, then the shelves you make yourself ("Casual", "Fine dining",
 * "Vestavia"). Any of them can feed Surprise me.
 */
export default function ListsView({
  spots,
  areas,
  onOpen,
  onSpin,
}: {
  spots: Spot[];
  areas: Area[];
  onOpen: (id: string) => void;
  /** Surprise me from this list ("saved", "been" or a list id) */
  onSpin: (from: string) => void;
}) {
  const { user, authReady, openAuth, lists, saved, been, deleteList } = useApp();
  const [editing, setEditing] = useState<SpinList | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const ctx = useMemo(() => ({ been, saved }), [been, saved]);
  const savedSpots = useMemo(() => spots.filter((s) => saved.includes(s.id)), [spots, saved]);
  const beenSpots = useMemo(() => spots.filter((s) => been[s.id]).sort((a, b) => (been[b.id].at ?? "").localeCompare(been[a.id].at ?? "")), [spots, been]);
  const mine = useMemo(() => lists.map((l) => ({ l, places: placesIn(l, spots, ctx) })), [lists, spots, ctx]);

  const startNew = () => {
    if (!user) return openAuth(LISTS_WHY, () => setEditing(blankList()));
    if (lists.length >= LISTS_MAX) return;
    setEditing(blankList());
  };

  const open = openId === "saved" ? { id: "saved", title: "Want to try", line: "Places you saved", places: savedSpots } : openId === "been" ? { id: "been", title: "Been", line: "Your Plate Passport", places: beenSpots } : (() => {
    const m = mine.find((x) => x.l.id === openId);
    return m ? { id: m.l.id, title: m.l.title, line: rulesLine(m.l.rules, m.l.spotIds.length && hasRules(m.l.rules) ? m.l.spotIds.length : 0) || `${m.l.spotIds.length} picked`, places: m.places, list: m.l } : null;
  })();

  if (open)
    return (
      <div className="lists">
        <button type="button" className="back-link" onClick={() => setOpenId(null)}>
          <Icon name="back" size={18} /> Lists
        </button>
        <header className="ld-head">
          <h1 className="page-title">{open.title}</h1>
          <p className="ld-line">
            {open.places.length} {open.places.length === 1 ? "place" : "places"}
            {open.line ? ` · ${open.line}` : ""}
          </p>
          <div className="ld-actions">
            <button type="button" className="btn btn-red" disabled={!open.places.length} onClick={() => onSpin(open.id)}>
              <Icon name="spark" size={18} /> Surprise me from this
            </button>
            {"list" in open && open.list && (
              <>
                <button type="button" className="btn btn-line" onClick={() => setEditing(open.list!)}>
                  Edit
                </button>
              </>
            )}
          </div>
        </header>
        {open.places.length ? (
          <ul className="grid">
            {open.places.map((s) => (
              <li key={s.id}>
                <button className="tile" onClick={() => onOpen(s.id)}>
                  <Poster spot={s}>{been[s.id] ? <span className="mark mark-been" aria-label="Been" /> : null}</Poster>
                  <span className="tile-name">{s.name}</span>
                  <span className="tile-meta">
                    {areaLabelOf(s).split(" & ")[0]} · {priceLabel(s.price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-line">Nothing in this one yet.</p>
        )}
        <ListEditor
          list={editing}
          spots={spots}
          areas={areas}
          onClose={() => setEditing(null)}
          onDeleted={() => {
            setEditing(null);
            setOpenId(null);
          }}
          onDelete={deleteList}
        />
      </div>
    );

  return (
    <div className="lists">
      <header className="page-head">
        <div>
          <h1 className="page-title">Lists</h1>
          <p className="page-sub">Make a list once, then let Surprise me pick from it.</p>
        </div>
        <button type="button" className="btn btn-ink" onClick={startNew}>
          <Icon name="plus" size={18} /> New list
        </button>
      </header>

      {authReady && !user ? (
        <section className="pitch">
          <div className="pitch-fan" aria-hidden>
            {spots.slice(0, 3).map((s) => (
              <span key={s.id} className="fan-card">
                <Cover spot={s} sizes="120px" small />
              </span>
            ))}
          </div>
          <h2>Your own shelves of places</h2>
          <p>
            &ldquo;Casual weeknight.&rdquo; &ldquo;Fine dining.&rdquo; &ldquo;Vestavia.&rdquo; Name a list, pick what goes in it, and Surprise me spins from just those.
          </p>
          <button type="button" className="btn btn-ink" onClick={() => openAuth(LISTS_WHY)}>
            Sign in to start
          </button>
        </section>
      ) : (
        <ul className="list-rows">
          <ListRow title="Want to try" line="Places you saved" places={savedSpots} onOpen={() => setOpenId("saved")} onSpin={() => onSpin("saved")} system />
          <ListRow title="Been" line="Your Plate Passport" places={beenSpots} onOpen={() => setOpenId("been")} onSpin={() => onSpin("been")} system />
          {mine.map(({ l, places }) => (
            <ListRow
              key={l.id}
              title={l.title}
              line={rulesLine(l.rules, hasRules(l.rules) ? l.spotIds.length : 0) || `${l.spotIds.length} picked by hand`}
              places={places}
              priv={!l.isPublic}
              onOpen={() => setOpenId(l.id)}
              onSpin={() => onSpin(l.id)}
            />
          ))}
          {mine.length === 0 && (
            <li className="list-starters">
              <p className="sh-sub">Start with one of these</p>
              <div className="pill-grid">
                {PRESETS.slice(0, 6).map((p) => (
                  <button key={p.title} type="button" className="pill" onClick={() => setEditing({ ...blankList(), title: p.title, rules: p.rules })}>
                    <Icon name="plus" size={14} /> {p.title}
                  </button>
                ))}
              </div>
            </li>
          )}
        </ul>
      )}
      <ListEditor list={editing} spots={spots} areas={areas} onClose={() => setEditing(null)} onDeleted={() => setEditing(null)} onDelete={deleteList} />
    </div>
  );
}

const blankList = (): SpinList => cleanList({ id: newListId(), title: "", rules: {}, spotIds: [], isPublic: true });

function ListRow({ title, line, places, onOpen, onSpin, system, priv }: { title: string; line: string; places: Spot[]; onOpen: () => void; onSpin: () => void; system?: boolean; priv?: boolean }) {
  return (
    <li className="lrow">
      <button type="button" className="lrow-main" onClick={onOpen}>
        <span className={`fan ${places.length ? "" : "fan-empty"}`} aria-hidden>
          {places.slice(0, 3).map((s) => (
            <span key={s.id} className="fan-card">
              <Cover spot={s} sizes="80px" small />
            </span>
          ))}
          {!places.length && <Icon name={system ? (title === "Been" ? "check" : "heart") : "lists"} size={22} />}
        </span>
        <span className="lrow-t">
          <b>
            {title}
            {priv && <span className="priv">Private</span>}
          </b>
          <span>
            {places.length} {places.length === 1 ? "place" : "places"}
            {line ? ` · ${line}` : ""}
          </span>
        </span>
      </button>
      <button type="button" className="icon-btn spin-btn" onClick={onSpin} disabled={!places.length} aria-label={`Surprise me from ${title}`} title="Surprise me from this list">
        <Icon name="spark" size={20} />
      </button>
    </li>
  );
}

/** make or change a list: a name, then what goes in it, with a live count */
export function ListEditor({
  list,
  spots,
  areas,
  onClose,
  onDelete,
  onDeleted,
}: {
  list: SpinList | null;
  spots: Spot[];
  areas: Area[];
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onDeleted: () => void;
}) {
  const { saveList, lists, been, saved, toast } = useApp();
  const [d, setD] = useState<SpinList | null>(list);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setD(list);
    setConfirm(false);
  }, [list]);
  const isNew = !!list && !lists.some((l) => l.id === list.id);
  const count = useMemo(() => (d ? placesIn(d, spots, { been, saved }).length : 0), [d, spots, been, saved]);
  const r = d?.rules ?? {};
  const set = (patch: Partial<ListRules>) => d && setD({ ...d, rules: { ...d.rules, ...patch } });
  const toggle = <T,>(key: "genres" | "where" | "prices" | "vibes", v: T) => {
    const cur = (r[key] ?? []) as T[];
    set({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<ListRules>);
  };
  const hoods = useMemo(() => areas.filter((a) => a.town), [areas]);

  async function save() {
    if (!d) return;
    if (!d.title.trim()) return toast("Give it a name first.", "err");
    setBusy(true);
    const out = await saveList({ ...d, title: d.title.trim() });
    setBusy(false);
    if (out) {
      track("list_saved", { rules: Object.keys(out.rules).length, picks: out.spotIds.length, new: isNew });
      toast(isNew ? `"${out.title}" is ready. Surprise me can spin from it.` : "List saved.", "ok");
      onClose();
    }
  }

  return (
    <Sheet
      open={!!list}
      onClose={onClose}
      title={isNew ? "New list" : "Edit list"}
      wide
      foot={
        <div className="le-foot">
          <span className="le-count">
            <b>{count}</b> {count === 1 ? "place" : "places"}
          </span>
          <button type="button" className="btn btn-ink" disabled={busy || !d?.title.trim()} onClick={save}>
            {busy ? "Saving…" : isNew ? "Make list" : "Save"}
          </button>
        </div>
      }
    >
      {d && (
        <div className="le">
          <label className="field">
            <span className="field-l">Name</span>
            <input
              data-autofocus
              value={d.title}
              maxLength={LIST_TITLE_MAX}
              onChange={(e) => setD({ ...d, title: e.target.value })}
              placeholder="Casual weeknight, Fine dining, Vestavia…"
            />
          </label>
          {isNew && !hasRules(d.rules) && !d.title && (
            <div className="pill-grid le-presets">
              {PRESETS.map((p) => (
                <button key={p.title} type="button" className="pill pill-soft" onClick={() => setD({ ...d, title: p.title, rules: p.rules })}>
                  {p.title}
                </button>
              ))}
            </div>
          )}

          <Group title="Occasion">
            {VIBES.slice(0, 10).map((v) => (
              <Pill key={v.id} on={!!r.vibes?.includes(v.id)} onClick={() => toggle("vibes", v.id)}>
                {v.label}
              </Pill>
            ))}
          </Group>
          <Group title="Price">
            {[1, 2, 3, 4].map((n) => (
              <Pill key={n} on={!!r.prices?.includes(n as 1)} onClick={() => toggle("prices", n)}>
                {priceLabel(n)}
              </Pill>
            ))}
          </Group>
          <Group title="Where">
            {TOWNS.map((t) => (
              <Pill key={t.id} on={!!r.where?.includes(`t:${t.id}`)} onClick={() => toggle("where", `t:${t.id}`)}>
                {t.label}
              </Pill>
            ))}
          </Group>
          <details className="le-more">
            <summary>Neighborhoods</summary>
            <div className="pill-grid">
              {hoods.map((a) => (
                <Pill key={a.id} on={!!r.where?.includes(a.id)} onClick={() => toggle("where", a.id)}>
                  {a.label}
                </Pill>
              ))}
            </div>
          </details>
          <Group title="Cuisine">
            {GENRES.map((g) => (
              <Pill key={g.id} on={!!r.genres?.includes(g.id)} onClick={() => toggle("genres", g.id as GenreId)}>
                {g.short}
              </Pill>
            ))}
          </Group>
          <div className="le-switches">
            <Switch on={!!r.notBeen} onChange={(v) => set({ notBeen: v || undefined })} label="Only places I haven't been" />
            <Switch on={!!r.wantOnly} onChange={(v) => set({ wantOnly: v || undefined })} label="Only my want-to-try list" />
            <Switch on={d.isPublic} onChange={(v) => setD({ ...d, isPublic: v })} label="Show it on my page" />
          </div>
          {d.spotIds.length > 0 && (
            <div className="le-picks">
              <p className="sh-sub">Added by hand ({d.spotIds.length})</p>
              <ul>
                {d.spotIds.map((id) => {
                  const s = spots.find((x) => x.id === id);
                  if (!s) return null;
                  return (
                    <li key={id}>
                      <span>{s.name}</span>
                      <button type="button" className="link-btn" onClick={() => setD({ ...d, spotIds: d.spotIds.filter((x) => x !== id) })}>
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p className="sh-note">Tip: on any place, tap List to add it here by hand.</p>
          {!isNew && (
            <div className="le-danger">
              <AnimatePresence initial={false} mode="wait">
                {confirm ? (
                  <motion.div key="c" className="row gap8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <span>Delete &ldquo;{d.title}&rdquo;?</span>
                    <button
                      type="button"
                      className="btn btn-red btn-sm"
                      onClick={async () => {
                        await onDelete(d.id);
                        onDeleted();
                      }}
                    >
                      Delete
                    </button>
                    <button type="button" className="link-btn" onClick={() => setConfirm(false)}>
                      Keep it
                    </button>
                  </motion.div>
                ) : (
                  <motion.button key="d" type="button" className="link-btn danger" onClick={() => setConfirm(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Delete this list
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="le-group">
      <legend>{title}</legend>
      <div className="pill-grid">{children}</div>
    </fieldset>
  );
}
function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`pill ${on ? "on" : ""}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}
function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden />
    </label>
  );
}

/** "List": put a place on your lists by hand, or start a new one with it */
export function AddToList({ spot, open, onClose, onNew }: { spot: Spot; open: boolean; onClose: () => void; onNew: (l: SpinList) => void }) {
  const { lists, saveList, toast } = useApp();
  const togglePick = async (l: SpinList) => {
    const on = l.spotIds.includes(spot.id);
    const out = await saveList({ ...l, spotIds: on ? l.spotIds.filter((x) => x !== spot.id) : [...l.spotIds, spot.id] });
    if (out) toast(on ? `Taken off "${l.title}".` : `Added to "${l.title}".`, "ok");
  };
  return (
    <Sheet open={open} onClose={onClose} title={`Add ${spot.name} to a list`}>
      <div className="radio-list">
        {lists.map((l) => {
          const on = l.spotIds.includes(spot.id);
          return (
            <button key={l.id} type="button" className={`radio ${on ? "on" : ""}`} aria-pressed={on} onClick={() => togglePick(l)}>
              <span>
                {l.title}
                <small>{l.spotIds.length} picked</small>
              </span>
              {on ? <Icon name="check" size={18} /> : <Icon name="plus" size={18} />}
            </button>
          );
        })}
        <button
          type="button"
          className="radio radio-new"
          onClick={() => {
            onClose();
            onNew(cleanList({ id: newListId(), title: "", rules: {}, spotIds: [spot.id], isPublic: true }));
          }}
        >
          <span>New list with {spot.name}</span>
          <Icon name="plus" size={18} />
        </button>
      </div>
    </Sheet>
  );
}
