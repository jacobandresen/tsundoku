// On-device OCR via Tesseract.js. Assets are self-hosted under
// `${BASE_URL}tesseract/` (see scripts/fetch-tesseract.mjs) and precached by the
// service worker for offline use. tesseract.js is dynamically imported so it
// lands in its own lazy chunk, loaded only on the first scan.

export type OcrProgress = {status: string; progress: number};

type TesseractWorker = Awaited<ReturnType<typeof import('tesseract.js').createWorker>>;

const asset = (file: string) => `${import.meta.env.BASE_URL}tesseract/${file}`;

// One worker, reused across scans. The logger is fixed at creation, so route it
// through a mutable per-scan callback.
let workerPromise: Promise<TesseractWorker> | null = null;
let progressCb: ((p: OcrProgress) => void) | null = null;

function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({createWorker}) =>
      createWorker(['eng', 'dan', 'jpn'], 1 /* OEM.LSTM_ONLY */, {
        workerPath: asset('worker.min.js'),
        corePath: asset('tesseract-core-simd-lstm.wasm.js'),
        langPath: asset(''),
        gzip: false, // raw tessdata_fast .traineddata, not gzipped
        logger: (m) => {
          if (progressCb && typeof m.progress === 'number') {
            progressCb({status: m.status, progress: m.progress});
          }
        },
      }),
    );
  }
  return workerPromise;
}

// Split OCR output into clean candidate lines. Pure — unit-tested without a worker.
export function parseLines(rawText: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawText.split('\n')) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (line.length < 2 || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

export type OcrResult = {text: string; confidence: number};

// Returns the single highest-confidence line, or null if nothing legible was found.
export async function recognizeBest(
  image: string | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult | null> {
  progressCb = onProgress ?? null;
  try {
    const worker = await getWorker();
    const {data} = await worker.recognize(image);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines: {text: string; confidence: number}[] = (data as any).lines ?? [];
    const candidates = lines
      .map((l) => ({text: l.text.replace(/\s+/g, ' ').trim(), confidence: l.confidence}))
      .filter((l) => l.text.length >= 2 && l.confidence > 0);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, l) => l.confidence > best.confidence ? l : best);
  } finally {
    progressCb = null;
  }
}
