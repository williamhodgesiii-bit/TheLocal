import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "The Local — Birmingham's independent food & drink map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#1C1714", color: "#F4ECDD", fontFamily: "serif" }}>
        <div style={{ width: 400, background: "#F4ECDD", display: "flex", flexDirection: "column", justifyContent: "center", padding: 48, color: "#1C1714" }}>
          {["Southern & Soul", "Barbecue", "Seafood & Oysters", "Chef's Table", "Drinks"].map((g, i) => (
            <div key={g} style={{ display: "flex", fontSize: 30, padding: "12px 0", borderBottom: "2px dashed rgba(28,23,20,.2)" }}>
              <span style={{ color: "#B4502A", width: 56 }}>{`0${i + 1}`}</span>
              {g}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: 70, position: "relative" }}>
          <div style={{ fontSize: 26, letterSpacing: 8, color: "#E2793A" }}>BIRMINGHAM, AL</div>
          <div style={{ fontSize: 150, fontWeight: 800, lineHeight: 1, marginTop: 10 }}>the Local</div>
          <div style={{ fontSize: 36, marginTop: 24, color: "#DCCDB2" }}>No drive-thrus. No chains. Just Birmingham.</div>
          <div style={{ position: "absolute", right: 90, top: 120, width: 28, height: 28, borderRadius: 99, background: "#E2793A", boxShadow: "0 0 0 14px rgba(226,121,58,.25)" }} />
        </div>
      </div>
    ),
    size
  );
}
