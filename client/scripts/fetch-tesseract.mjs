/**
 * fetch-tesseract.mjs
 * Self-hosts the Tesseract.js OCR assets in client/public/tesseract/ so OCR runs
 * with no CDN dependency and can be precached by the service worker for offline.
 *
 * Copies (from node_modules, version-matched to the installed package):
 *   - worker.min.js                      the Tesseract worker script
 *   - tesseract-core-simd-lstm.wasm.js   single pinned WASM core (LSTM, SIMD)
 * Downloads (pinned tessdata_fast tag, LSTM-compatible, mobile-sized):
 *   - <lang>.traineddata for eng, dan, jpn
 *
 * Idempotent: existing non-empty files are skipped. Run:  node scripts/fetch-tesseract.mjs
 */

import {createRequire} from 'node:module';
import {mkdir, copyFile, writeFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'tesseract');

// We pin ONE core variant. getCore() in tesseract.js uses corePath verbatim when
// it ends in "js", skipping feature detection — so the browser requests exactly
// this file. simd-lstm is supported by every browser this PWA targets.
const CORE_FILE = 'tesseract-core-simd-lstm.wasm.js';
const WORKER_FILE = 'worker.min.js';

const TESSDATA_TAG = '4.1.0';
const LANGS = ['eng', 'dan', 'jpn'];
const TESSDATA_BASE = `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/${TESSDATA_TAG}`;

const require = createRequire(ROOT + '/');

async function exists(p) {
  try {
    return (await stat(p)).size > 0;
  } catch {
    return false;
  }
}

async function copyAsset(srcDir, file) {
  const dest = path.join(OUT_DIR, file);
  if (await exists(dest)) {
    console.log(`  ·  ${file} (cached)`);
    return;
  }
  await copyFile(path.join(srcDir, file), dest);
  console.log(`  ✓  ${file}`);
}

async function downloadLang(lang) {
  const dest = path.join(OUT_DIR, `${lang}.traineddata`);
  if (await exists(dest)) {
    console.log(`  ·  ${lang}.traineddata (cached)`);
    return;
  }
  const url = `${TESSDATA_BASE}/${lang}.traineddata`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download ${url}: HTTP ${resp.status}`);
  await writeFile(dest, Buffer.from(await resp.arrayBuffer()));
  console.log(`  ✓  ${lang}.traineddata`);
}

await mkdir(OUT_DIR, {recursive: true});

const tjsDir = path.dirname(require.resolve('tesseract.js/package.json'));
const coreDir = path.dirname(
  require.resolve('tesseract.js-core/package.json', {paths: [tjsDir]}),
);

await copyAsset(path.join(tjsDir, 'dist'), WORKER_FILE);
await copyAsset(coreDir, CORE_FILE);
for (const lang of LANGS) await downloadLang(lang);

console.log(`\nDone. Tesseract assets in ${path.relative(ROOT, OUT_DIR)}/`);
