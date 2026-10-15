"use client";

import { useState } from "react";
import { CITIES, CITY_BY_ID, DEFAULT_CITY, STATES, homeLabel, homeParts, isOpenCity, otherHome, stateName } from "@/lib/regions";

/**
 * "Where's home?" A city on the map, one that's coming, or a town we don't have yet.
 * Home is where the map opens every visit; it can be anywhere, even before we get there.
 */
export default function HomeSelect({ value, onChange, label = "Where's home?" }: { value: string; onChange: (home: string) => void; label?: string }) {
  const other = value.startsWith("other:");
  const parts = other ? homeParts(value) : null;
  const [town, setTown] = useState(parts?.city ?? "");
  const [st, setSt] = useState(parts?.state || CITY_BY_ID[DEFAULT_CITY]?.state || "AL");
  // states we have cities in, in the order the cities are listed
  const states = CITIES.map((c) => c.state).filter((s, i, all) => all.indexOf(s) === i);
  const open = isOpenCity(value);

  return (
    <div className="home-select">
      <label>
        <span>{label}</span>
        <select value={other ? "other" : value} onChange={(e) => onChange(e.target.value === "other" ? otherHome(town, st) : e.target.value)}>
          {states.map((code) => (
            <optgroup key={code} label={stateName(code)}>
              {CITIES.filter((c) => c.state === code).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.status === "later" ? " (coming soon)" : ""}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="other">Somewhere else…</option>
        </select>
      </label>
      {other && (
        <div className="form-grid">
          <label>
            <span>Town</span>
            <input
              value={town}
              onChange={(e) => {
                setTown(e.target.value);
                onChange(otherHome(e.target.value, st));
              }}
              placeholder="Your town"
              required
              maxLength={60}
            />
          </label>
          <label>
            <span>State</span>
            <select
              value={st}
              onChange={(e) => {
                setSt(e.target.value);
                onChange(otherHome(town, e.target.value));
              }}
            >
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <p className="home-note">
        {open
          ? "The map opens here every time you visit. Out of town? Pick where you are at the top of the list. Your home stays put."
          : `${(other && !town.trim()) ? "Your town" : homeLabel(value)} isn't on the map yet. We'll show you ${CITY_BY_ID[DEFAULT_CITY].name} for now and email you once when it opens.`}
      </p>
    </div>
  );
}
