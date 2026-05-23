// Canvas-based image preprocessing to improve OCR accuracy on cover photos.
// Pipeline: upscale → grayscale → morphological top-hat → percentile contrast stretch → sharpen.
// Returns {dataUrl, width, height} of the preprocessed image (same aspect ratio
// as original). On failure, returns the original image with its natural dimensions.

export type PreprocessResult = {dataUrl: string; width: number; height: number};

export async function preprocessForOcr(dataUrl: string): Promise<PreprocessResult> {
  try {
    return await _run(dataUrl);
  } catch {
    try {
      const img = await decode(dataUrl);
      return {dataUrl, width: img.naturalWidth, height: img.naturalHeight};
    } catch {
      return {dataUrl, width: 0, height: 0};
    }
  }
}

async function _run(dataUrl: string): Promise<PreprocessResult> {
  const img = await decode(dataUrl);

  // Scale up to TARGET_DIM on the longest side. Stored images are compressed to
  // 900px max (imageStore.ts) — upscaling to ~2400px gives Tesseract more to work
  // with without ballooning memory.
  const TARGET_DIM = 2400;
  const scale = Math.min(TARGET_DIM / Math.max(img.naturalWidth, img.naturalHeight), 3);
  const w = Math.round(img.naturalWidth  * Math.max(scale, 1));
  const h = Math.round(img.naturalHeight * Math.max(scale, 1));

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const frame = ctx.getImageData(0, 0, w, h);
  const px    = frame.data;
  const n     = w * h;

  // --- Grayscale ---
  const gray = new Uint8ClampedArray(n);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    gray[j] = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
  }

  // --- Morphological top-hat: suppress slowly-varying background, enhance text ---
  // Handles covers with complex illustration backgrounds and uneven lighting.
  const enhanced = morphTopHat(gray, w, h);

  // --- Percentile contrast stretch (clip 5%–95%) on enhanced image ---
  const hist = new Uint32Array(256);
  for (let j = 0; j < n; j++) hist[enhanced[j]] += 1;
  const CLIP = 0.05;
  let lo = 0, hi = 255, sum = 0;
  for (let v = 0; v < 256; v++) { sum += hist[v]; if (sum < n * CLIP) lo = v; else break; }
  sum = 0;
  for (let v = 255; v >= 0; v--) { sum += hist[v]; if (sum < n * CLIP) hi = v; else break; }
  const range = hi - lo || 1;

  // --- 3×3 unsharp / Laplacian sharpen ---
  //  [ 0 -1  0 ]
  //  [-1  5 -1 ]
  //  [ 0 -1  0 ]
  const sharp = new Uint8ClampedArray(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const t = y > 0     ? enhanced[i - w] : enhanced[i];
      const b = y < h - 1 ? enhanced[i + w] : enhanced[i];
      const l = x > 0     ? enhanced[i - 1] : enhanced[i];
      const r = x < w - 1 ? enhanced[i + 1] : enhanced[i];
      sharp[i] = Math.min(255, Math.max(0, 5 * enhanced[i] - t - b - l - r));
    }
  }

  // --- Write back: stretch then apply sharpened value ---
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const g = Math.min(255, Math.max(0, Math.round(((sharp[j] - lo) / range) * 255)));
    px[i] = px[i + 1] = px[i + 2] = g;
    // alpha unchanged
  }
  ctx.putImageData(frame, 0, 0);

  return {dataUrl: canvas.toDataURL('image/png'), width: w, height: h};
}

// Morphological top-hat filter. Suppresses the slowly-varying background so
// text features stand out regardless of illumination variation or complex
// illustration backgrounds.
//
// Formula: f + WTH(f) − BTH(f)  =  3f − opening(f) − closing(f)
//   WTH (white top-hat) = f − opening(f): extracts bright-on-dark features.
//   BTH (black top-hat) = closing(f) − f: extracts dark-on-light features.
//   Adding both and the original amplifies local text contrast in both polarities:
//   bright text → pushed toward 255, dark text → pushed toward 0.
//
// The structuring element radius defaults to ~1/20 of the longest dimension so
// it is larger than individual text strokes but smaller than large background
// regions. Exported for unit testing.
export function morphTopHat(
  gray: Uint8ClampedArray, w: number, h: number,
  r = Math.max(30, Math.min(200, Math.round(Math.max(w, h) / 20)))
): Uint8ClampedArray {
  const n = w * h;
  const tmp    = new Uint8ClampedArray(n);
  const opened = new Uint8ClampedArray(n);
  const closed = new Uint8ClampedArray(n);

  // opening(f) = dilate(erode(f))  — removes features smaller than SE
  slideRows(gray,   tmp,    w, h, r, Math.min);
  slideCols(tmp,    opened, w, h, r, Math.min);
  slideRows(opened, tmp,    w, h, r, Math.max);
  slideCols(tmp,    opened, w, h, r, Math.max);

  // closing(f) = erode(dilate(f))  — fills gaps smaller than SE
  slideRows(gray,   tmp,    w, h, r, Math.max);
  slideCols(tmp,    closed, w, h, r, Math.max);
  slideRows(closed, tmp,    w, h, r, Math.min);
  slideCols(tmp,    closed, w, h, r, Math.min);

  const result = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) {
    result[i] = Math.min(255, Math.max(0, 3 * gray[i] - opened[i] - closed[i]));
  }
  return result;
}

// Van Herk/Gil-Werman O(n) sliding-window extremum along image rows.
// Uses edge-value padding: border pixels are replicated r times so all
// windows are exactly (2r+1) wide and boundary pixels are correct.
function slideRows(
  src: Uint8ClampedArray, dst: Uint8ClampedArray,
  w: number, h: number, r: number,
  fn: (a: number, b: number) => number
): void {
  const k   = 2 * r + 1;
  const pw  = w + 2 * r;  // padded width
  const row = new Uint8Array(pw);
  const g   = new Uint8Array(pw);  // prefix extremum (left→right within block)
  const hh  = new Uint8Array(pw);  // suffix extremum (right→left within block)

  for (let y = 0; y < h; y++) {
    const base = y * w;

    // Build padded row: replicate edge pixels into the r-wide margins
    row.fill(src[base],         0,     r);
    for (let i = 0; i < w; i++) row[r + i] = src[base + i];
    row.fill(src[base + w - 1], r + w, pw);

    // Build prefix and suffix extrema in non-overlapping blocks of size k
    for (let bs = 0; bs < pw; bs += k) {
      const be = Math.min(bs + k - 1, pw - 1);
      g[bs]  = row[bs];
      for (let i = bs + 1; i <= be; i++) g[i]  = fn(g[i - 1], row[i]);
      hh[be] = row[be];
      for (let i = be - 1; i >= bs; i--) hh[i] = fn(hh[i + 1], row[i]);
    }

    // Query: pixel x lives at padded position r+x, so its window is [x, x+k-1].
    // By the van Herk property, min(hh[x], g[x+k-1]) equals the extremum over
    // exactly that window because the window always spans one block boundary.
    for (let x = 0; x < w; x++) {
      dst[base + x] = fn(hh[x], g[x + k - 1]);
    }
  }
}

// Van Herk/Gil-Werman O(n) sliding-window extremum along image columns.
function slideCols(
  src: Uint8ClampedArray, dst: Uint8ClampedArray,
  w: number, h: number, r: number,
  fn: (a: number, b: number) => number
): void {
  const k   = 2 * r + 1;
  const ph  = h + 2 * r;  // padded height
  const col = new Uint8Array(ph);
  const g   = new Uint8Array(ph);
  const hh  = new Uint8Array(ph);

  for (let x = 0; x < w; x++) {
    col.fill(src[x],                0,     r);
    for (let i = 0; i < h; i++) col[r + i] = src[i * w + x];
    col.fill(src[(h - 1) * w + x], r + h, ph);

    for (let bs = 0; bs < ph; bs += k) {
      const be = Math.min(bs + k - 1, ph - 1);
      g[bs]  = col[bs];
      for (let i = bs + 1; i <= be; i++) g[i]  = fn(g[i - 1], col[i]);
      hh[be] = col[be];
      for (let i = be - 1; i >= bs; i--) hh[i] = fn(hh[i + 1], col[i]);
    }

    for (let y = 0; y < h; y++) {
      dst[y * w + x] = fn(hh[y], g[y + k - 1]);
    }
  }
}

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = src;
  });
}
