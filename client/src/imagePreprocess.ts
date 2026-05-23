// Canvas-based image preprocessing to improve OCR accuracy on cover photos.
// Pipeline: upscale → grayscale → percentile contrast stretch → sharpen.
// Returns a PNG data URL, or the original if anything fails.

export async function preprocessForOcr(dataUrl: string): Promise<string> {
  try {
    return await _run(dataUrl);
  } catch {
    return dataUrl;
  }
}

async function _run(dataUrl: string): Promise<string> {
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
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    gray[j]  = g;
    hist[g] += 1;
  }

  // --- Percentile contrast stretch (clip 5 %–95 %) ---
  // Clips extreme values so a single bright/dark outlier can't flatten the
  // whole image.
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
      // Clamp neighbours to edge pixels instead of wrapping.
      const t  = y > 0     ? gray[i - w] : gray[i];
      const b  = y < h - 1 ? gray[i + w] : gray[i];
      const l  = x > 0     ? gray[i - 1] : gray[i];
      const r  = x < w - 1 ? gray[i + 1] : gray[i];
      sharp[i] = Math.min(255, Math.max(0, 5 * gray[i] - t - b - l - r));
    }
  }

  // --- Write back: stretch then apply sharpened value ---
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const g = Math.min(255, Math.max(0, Math.round(((sharp[j] - lo) / range) * 255)));
    px[i] = px[i + 1] = px[i + 2] = g;
    // alpha unchanged
  }
  ctx.putImageData(frame, 0, 0);

  return canvas.toDataURL('image/png');
}

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src     = src;
  });
}
