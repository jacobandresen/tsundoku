// On-device OCR via Tesseract.js. Assets are self-hosted under
// `${BASE_URL}tesseract/` (see scripts/fetch-tesseract.mjs) and precached by the
// service worker for offline use. tesseract.js is dynamically imported so it
// lands in its own lazy chunk, loaded only on the first scan.

import {preprocessForOcr} from './imagePreprocess.ts';

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
      }).then(async (w) => {
        // PSM 11 = sparse text: find text anywhere without assumed layout.
        // Set once at worker creation since we always scan covers.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (w as any).setParameters({tessedit_pageseg_mode: '11'});
        return w;
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
    const preprocessed = typeof image === 'string' ? await preprocessForOcr(image) : null;
    const input = preprocessed?.dataUrl ?? (image as Blob);
    // Request block-level output so we get per-line confidence scores.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {data} = await (worker as any).recognize(input, undefined, {blocks: true});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allLines = ((data as any).blocks ?? []).flatMap((b: any) =>
      b.paragraphs.flatMap((p: any) => p.lines),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidates = allLines
      .map((l: any) => ({text: l.text.replace(/\s+/g, ' ').trim(), confidence: l.confidence}))
      .filter((l: any) => l.text.length >= 2 && l.confidence > 0);
    if (candidates.length === 0) return null;
    return (candidates as OcrResult[]).reduce((best, l) => l.confidence > best.confidence ? l : best);
  } finally {
    progressCb = null;
  }
}

export type OcrLine = {
  text: string;
  confidence: number;
  bbox: {x0: number; y0: number; x1: number; y1: number};
  imageWidth: number;
  imageHeight: number;
};

// Returns all lines with confidence ≥ 50%, with bbox coords in preprocessed
// image space. Used by TitlePickerOverlay to position tappable highlights.
export async function recognizeAllLines(
  image: string | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrLine[]> {
  progressCb = onProgress ?? null;
  try {
    const worker = await getWorker();
    const preprocessed = typeof image === 'string' ? await preprocessForOcr(image) : null;
    const input = preprocessed?.dataUrl ?? (image as Blob);
    const imageWidth = preprocessed?.width ?? 0;
    const imageHeight = preprocessed?.height ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {data} = await (worker as any).recognize(input, undefined, {blocks: true});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allLines = ((data as any).blocks ?? []).flatMap((b: any) =>
      b.paragraphs.flatMap((p: any) => p.lines),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (allLines as any[])
      .map((l) => ({
        text: l.text.replace(/\s+/g, ' ').trim(),
        confidence: l.confidence,
        bbox: l.bbox,
        imageWidth,
        imageHeight,
      }))
      .filter((l) => l.text.length >= 2 && l.confidence >= 50);
  } finally {
    progressCb = null;
  }
}
