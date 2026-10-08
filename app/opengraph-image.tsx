import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "The Local: Birmingham restaurants, coffee and bars";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  const rows: [string, string][] = [
    ["Southern & Soul", "8"],
    ["Barbecue", "4"],
    ["Seafood & Oysters", "4"],
    ["Coffee", "4"],
    ["Drinks", "16"],
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F4EFE1", color: "#22201C", fontFamily: "serif", padding: 40 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "2px solid #22201C", padding: "40px 56px", background: "#FBF8EF" }}>
          <div style={{ fontSize: 96, fontStyle: "italic", color: "#B23A24", lineHeight: 1 }}>The Local</div>
          <div style={{ fontSize: 28, marginTop: 10, borderBottom: "4px double #22201C", paddingBottom: 16 }}>
            Locally owned restaurants, coffee &amp; bars of Birmingham, Ala.
          </div>
          {rows.map(([g, n]) => (
            <div key={g} style={{ display: "flex", fontSize: 34, marginTop: 18 }}>
              <span>{g}</span>
              <span style={{ flex: 1, borderBottom: "3px dotted #8a857a", margin: "0 14px 10px" }} />
              <span style={{ color: "#6B665B" }}>{n}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
