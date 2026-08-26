import { GUESS_COLS, GUESS_ROWS } from "../utils/constants";
import { loadImage } from "../utils/image";

// Fallback scoring when the vision call fails: busy, high-contrast cells are
// assumed to carry more information than flat ones. Detail isn't the same as
// identity, so this is a fallback, never the primary signal.
const SAMPLE_WIDTH = 320;

export async function importanceFromPixels(url: string): Promise<number[]> {
  const img = await loadImage(url);
  const w = SAMPLE_WIDTH;
  const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(img, 0, 0, w, h);

  // Reading back pixels throws on a tainted canvas if the host sent no CORS
  // headers — the caller falls back to a flat board.
  const { data } = ctx.getImageData(0, 0, w, h);
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i += 1) {
    const p = i * 4;
    lum[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  const scores: number[] = [];
  for (let row = 0; row < GUESS_ROWS; row += 1) {
    for (let col = 0; col < GUESS_COLS; col += 1) {
      const x0 = Math.floor((col * w) / GUESS_COLS);
      const x1 = Math.floor(((col + 1) * w) / GUESS_COLS);
      const y0 = Math.floor((row * h) / GUESS_ROWS);
      const y1 = Math.floor(((row + 1) * h) / GUESS_ROWS);

      let edge = 0;
      let count = 0;
      for (let y = y0; y < y1 - 1; y += 1) {
        for (let x = x0; x < x1 - 1; x += 1) {
          const i = y * w + x;
          edge += Math.abs(lum[i] - lum[i + 1]) + Math.abs(lum[i] - lum[i + w]);
          count += 1;
        }
      }
      scores.push(count > 0 ? edge / count : 0);
    }
  }

  const max = Math.max(...scores);
  return max > 0 ? scores.map((s) => s / max) : scores.map(() => 0.5);
}
