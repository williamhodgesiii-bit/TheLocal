"use client";

import { useState } from "react";
import { SPOT_BY_ID } from "@/lib/data";
import { useApp } from "./Providers";
import { NEWSLETTER } from "@/lib/brand";

export default function PartnerForm({ spot, fix }: { spot?: string; fix?: boolean }) {
  const { backend, toast } = useApp();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const known = spot ? SPOT_BY_ID[spot] : undefined;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await backend.lead({
        name: String(f.get("name")),
        business: String(f.get("business")),
        email: String(f.get("email")),
        tier: String(f.get("tier")),
        message: String(f.get("message") || ""),
        ...(known ? { spot: known.id } : {}),
      });
      setDone(true);
    } catch (err) {
      toast(err instanceof Error && err.message ? err.message : "That didn't go through. Try again?", "err");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="form-done">
        <p className="modal-title">Got it. Thank you.</p>
        <p className="muted">We&apos;ll be in touch soon.</p>
      </div>
    );

  return (
    <form className="form partner-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          <span>Your name</span>
          <input name="name" required />
        </label>
        <label>
          <span>Business</span>
          <input name="business" required defaultValue={known?.name} />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" required />
        </label>
        <label>
          <span>I&apos;m interested in</span>
          <select name="tier" defaultValue={fix ? "correction" : known ? "neighbor" : "regular"}>
            <option value="neighbor">Free listing (claim my page)</option>
            <option value="regular">Partner, $39 a month</option>
            <option value="institution">Featured, $99 a month</option>
            <option value="invites">Plate Invites (host local reviewers)</option>
            <option value="newsletter">Sponsor {NEWSLETTER}</option>
            <option value="correction">A listing is closed or wrong</option>
          </select>
        </label>
      </div>
      <label>
        <span>Anything else?</span>
        <textarea name="message" rows={4} placeholder="Tell us about your place, or what needs fixing" />
      </label>
      <button className="btn btn-green" disabled={busy}>
        {busy ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
