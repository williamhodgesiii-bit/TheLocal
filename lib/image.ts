/** Downscale + re-encode an image client-side before upload (keeps storage and bandwidth sane). */
export async function resizeImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > 25 * 1024 * 1024) throw new Error("That image is over 25 MB.");
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't encode image."))), "image/jpeg", quality));
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through (e.g. HEIC on some browsers) */
    }
  }
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("This browser can't read that image format. Try a JPG or PNG."));
    img.src = URL.createObjectURL(file);
  });
}

/** A square, center-cropped JPEG (profile pictures). */
export async function squareImage(file: File, size: number): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > 25 * 1024 * 1024) throw new Error("That image is over 25 MB.");
  const bitmap = await loadBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't encode image."))), "image/jpeg", 0.85));
}
