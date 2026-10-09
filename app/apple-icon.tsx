import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#B23A24", color: "#FBF8EF", fontSize: 130, fontStyle: "italic", fontFamily: "serif" }}>
        L
      </div>
    ),
    size
  );
}
