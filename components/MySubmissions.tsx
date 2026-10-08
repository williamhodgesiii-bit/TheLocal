"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, ShieldCheck, ShieldX, X } from "lucide-react";
import type { Submission } from "@/lib/backend";
import { CITY_BY_ID } from "@/lib/regions";
import { useApp } from "./Providers";

export default function MySubmissions({ open, onClose, onOpenSpot, onAdd }: { open: boolean; onClose: () => void; onOpenSpot: (s: Submission) => void; onAdd: () => void }) {
  const { backend } = useApp();
  const [list, setList] = useState<Submission[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setList(null);
    backend.mySubmissions().then(setList).catch(() => setList([]));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, backend, onClose]);

  const approved = list?.filter((s) => s.status === "approved").length ?? 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="modal my-subs"
            role="dialog"
            aria-modal="true"
            aria-label="Your spots"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="icon-btn modal-x" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
            <div className="stamp">{approved >= 5 ? "Founding Local" : approved >= 1 ? "Verified contributor" : "Your spots"}</div>
            <h2 className="display">Spots you&apos;ve added</h2>
            <p className="muted small">
              {approved > 0 ? `${approved} verified and live on the map — thank you.` : "Add the places you love. We verify each one before it goes live."}
            </p>

            {list === null ? (
              <div className="skeleton-list">
                <span />
                <span />
              </div>
            ) : list.length === 0 ? (
              <div className="empty">
                <p className="display">Nothing yet.</p>
                <button className="btn btn-rust btn-sm" onClick={onAdd}>
                  Add your first spot
                </button>
              </div>
            ) : (
              <ul className="sub-list">
                {list.map((s) => (
                  <li key={s.id} className={s.status}>
                    <span className="sub-icon">
                      {s.status === "approved" ? <ShieldCheck size={18} /> : s.status === "rejected" ? <ShieldX size={18} /> : <Clock size={18} />}
                    </span>
                    <span className="sub-main">
                      <strong>{s.name}</strong>
                      <span className="mono-sm">
                        {s.areaLabel} · {CITY_BY_ID[s.cityId]?.name ?? s.cityId} · {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                      {s.status === "rejected" && s.rejectReason && <span className="sub-reason">Not approved: {s.rejectReason}</span>}
                    </span>
                    {s.status === "approved" && s.spotId ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => onOpenSpot(s)}>
                        View
                      </button>
                    ) : (
                      <span className={`sub-pill ${s.status}`}>{s.status === "pending" ? "Verifying" : s.status === "approved" ? "Live" : "Declined"}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {list && list.length > 0 && (
              <button className="btn btn-rust btn-block" onClick={onAdd} style={{ marginTop: 16 }}>
                Add another spot
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
