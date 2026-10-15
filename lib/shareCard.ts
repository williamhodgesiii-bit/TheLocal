import { BRAND, MANTRA } from "./brand";

/**
 * The passport share card: a picture of your progress, not a list of where you've been
 * (people share progress; they don't want to broadcast their whereabouts).
 * Drawn in the browser, so it works offline and costs nothing to serve.
 */
export async function passportCard({ count, total, city, stamped }: { count: number; total: number; city: string; stamped: boolean[] }): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  if (!x) return null;
  try {
    await Promise.all([document.fonts.load('80px "Yellowtail"'), document.fonts.load('60px "Young Serif"'), document.fonts.load('600 30px "Libre Franklin Variable"')]);
  } catch {
    /* system fonts are fine */
  }
  const paper = "#f4efe1";
  const card = "#fbf8ef";
  const ink = "#22201c";
  const red = "#b23a24";
  x.fillStyle = paper;
  x.fillRect(0, 0, W, H);
  x.fillStyle = card;
  x.fillRect(48, 48, W - 96, H - 96);
  x.strokeStyle = ink;
  x.lineWidth = 3;
  x.strokeRect(48, 48, W - 96, H - 96);
  x.lineWidth = 1.5;
  x.strokeRect(62, 62, W - 124, H - 124);

  // the plate mark
  x.save();
  x.translate(W / 2 - 90, 120);
  x.scale(180 / 48, 180 / 48);
  const circle = (r: number, fill: string | null, stroke: string | null, w: number, alpha = 1) => {
    x.beginPath();
    x.arc(24, 24, r, 0, Math.PI * 2);
    if (fill) {
      x.fillStyle = fill;
      x.fill();
    }
    if (stroke) {
      x.globalAlpha = alpha;
      x.strokeStyle = stroke;
      x.lineWidth = w;
      x.stroke();
      x.globalAlpha = 1;
    }
  };
  circle(22.6, card, ink, 1.6);
  circle(18.4, null, red, 2.4);
  circle(14.6, null, ink, 1, 0.22);
  x.strokeStyle = ink;
  x.lineWidth = 1.3;
  x.stroke(new Path2D("M17.2 33.4V22.6a6.8 6.8 0 0 1 13.6 0v10.8"));
  x.fillStyle = red;
  x.fill(new Path2D("M19.2 33.4V22.8a4.8 4.8 0 0 1 9.6 0v10.6Z"));
  x.fillStyle = card;
  x.fill(new Path2D("M20.6 22.6a3.4 3.4 0 0 1 6.8 0Z"));
  x.beginPath();
  x.arc(26.4, 28.6, 1, 0, Math.PI * 2);
  x.fill();
  x.lineCap = "round";
  x.lineWidth = 1.6;
  x.stroke(new Path2D("M15.4 33.8h17.2"));
  x.restore();

  x.textAlign = "center";
  x.fillStyle = red;
  x.font = '76px "Yellowtail", cursive';
  x.fillText(BRAND, W / 2, 400);
  x.fillStyle = ink;
  x.font = '600 30px "Libre Franklin Variable", sans-serif';
  x.fillText("MY PLATE PASSPORT", W / 2, 462);

  x.font = '190px "Young Serif", Georgia, serif';
  x.fillText(String(count), W / 2, 680);
  x.font = '40px "Young Serif", Georgia, serif';
  x.fillText(`of ${total} locally owned plates`, W / 2, 750);
  x.fillText(`around ${city}`, W / 2, 800);

  // one stamp per place: progress you can see, places you can't
  const cols = 13;
  const cell = 58;
  const gx = (W - cols * cell) / 2 + cell / 2;
  const gy = 880;
  stamped.forEach((on, i) => {
    const cx = gx + (i % cols) * cell;
    const cy = gy + Math.floor(i / cols) * cell;
    x.beginPath();
    x.arc(cx, cy, 20, 0, Math.PI * 2);
    if (on) {
      x.fillStyle = red;
      x.fill();
    } else {
      x.strokeStyle = "rgba(34,32,28,.28)";
      x.lineWidth = 2;
      x.stroke();
    }
  });

  x.fillStyle = ink;
  x.font = '600 30px "Libre Franklin Variable", sans-serif';
  x.fillText(MANTRA.toUpperCase(), W / 2, H - 112);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

/** Share the card where the phone allows it; otherwise save it. */
export async function sharePassport(blob: Blob, text: string) {
  const file = new File([blob], "plate-passport.png", { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
  } catch {
    return "dismissed";
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "plate-passport.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "saved";
}
