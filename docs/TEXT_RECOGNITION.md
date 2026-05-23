# Text Recognition in Tsundoku

## Overview

Tsundoku uses on-device OCR (via Tesseract.js) to read titles from cover photos.
The image is preprocessed before scanning to compensate for the noisy, complex
backgrounds typical of book/comic/DVD covers.

---

## Pipeline (`client/src/imagePreprocess.ts`)

```
Photo → Upscale → Grayscale → Morphological Top-Hat → Contrast Stretch → Sharpen → Tesseract
```

### 1. Upscale
Stored images are compressed to ≤900 px (JPEG 0.80) by `imageStore.ts`. The
preprocessing step scales the longest side up to 2400 px, giving Tesseract
more pixels to work with. Scale factor is capped at 3× to avoid runaway
memory use on very small thumbnails.

### 2. Grayscale
Standard luminance: `L = 0.299R + 0.587G + 0.114B`.

### 3. Morphological Top-Hat Filter _(the main text-enhancement step)_

#### Background — Mathematical Morphology
Morphological operations define erosion and dilation over a *structuring
element* (SE) — a small neighbourhood shape.

| Operation | Definition | Effect on image |
|-----------|-----------|-----------------|
| Erosion `f ⊖ SE` | local minimum over SE | shrinks bright blobs, expands dark blobs |
| Dilation `f ⊕ SE` | local maximum over SE | expands bright blobs, shrinks dark blobs |
| Opening `(f ⊖ SE) ⊕ SE` | erode then dilate | removes features *smaller* than SE; estimates slow background |
| Closing `(f ⊕ SE) ⊖ SE` | dilate then erode | fills gaps *smaller* than SE; estimates background from below |

#### White Top-Hat (WTH) and Black Top-Hat (BTH)

```
WTH(f) = f − opening(f)      ← extracts bright features (light text on dark bg)
BTH(f) = closing(f) − f      ← extracts dark features  (dark text on light bg)
```

Both are non-negative. They isolate *text-sized* features from the
slowly-varying background by subtracting the background estimate.

#### Combined formula

To enhance text regardless of polarity (light-on-dark or dark-on-light):

```
enhanced = f + WTH(f) − BTH(f)
         = f + (f − opening) − (closing − f)
         = 3f − opening(f) − closing(f)
```

Effect:
- Bright text on dark bg → opening≈dark, closing≈original → **pushed toward 255**
- Dark text on light bg  → opening≈original, closing≈light → **pushed toward 0**
- Uniform background     → opening≈closing≈f → **unchanged**

This also automatically compensates for uneven illumination (shadows, gradients)
because the opening/closing estimate the *local* background, not a global value.

#### Structuring element
A square (separable) SE is used with radius `r ≈ max(w,h) / 20`, clamped to
[30, 200] px. At 2400 px this gives r≈120 (SE width 241 px), which is larger
than typical text strokes (10–30 px) but smaller than large background regions.

Large display-title text (≥300 px tall) is already high-contrast on most covers
and benefits less from this filter — it is handled mainly by the contrast-stretch
step.

#### Algorithm: Van Herk / Gil-Werman (O(n) sliding min/max)
Naive morphology with a large SE is O(n·r²). The separable approach reduces
this to O(n·r) (one row pass + one column pass), and the van Herk algorithm
reduces it further to **O(n) regardless of r** using prefix/suffix extremum
arrays built in non-overlapping blocks of width `k = 2r+1`.

Edge pixels are padded with their nearest border value so all windows are
exactly `k` wide (no boundary artefacts).

### 4. Percentile Contrast Stretch
Clips the bottom and top 5 % of the histogram to remap pixel values to the
full [0, 255] range. Handles under- and over-exposed photos.

### 5. Laplacian Sharpening
3×3 unsharp mask kernel:

```
 [ 0 -1  0 ]
 [-1  5 -1 ]
 [ 0 -1  0 ]
```

Edge pixels clamp to their nearest neighbour rather than wrapping.

---

## OCR Engine (`client/src/ocr.ts`)

- **Library**: Tesseract.js (WASM build, runs entirely on-device)
- **Languages**: English (`eng`), Danish (`dan`), Japanese (`jpn`) — loaded on demand
- **Page Segmentation Mode**: PSM 11 (sparse text — no assumed layout)
- **Functions**:
  - `recognizeBest(dataUrl)` — returns the single highest-confidence line
  - `recognizeAllLines(dataUrl, onProgress)` — returns all lines with bounding boxes

### Post-processing (`parseLines`)
- Trim whitespace, collapse internal runs
- Drop lines shorter than 2 characters
- Deduplicate while preserving order

---

## Title Picker UI (`client/src/components/TitlePickerOverlay.tsx`)

After OCR, each recognised line is shown as a tappable bounding box overlaid
on the cover image. The user can tap one or more regions; selected regions are
concatenated in tap order (separated by spaces) to build the title string.

Bounding-box coordinates from Tesseract (in preprocessed-image space) are mapped
to rendered display coordinates accounting for the letterbox offset when the
image aspect ratio doesn't match the viewport.

---

## Known Limitations

- Tesseract struggles with highly stylised / decorative fonts common on fantasy
  or graphic-novel covers.
- Very large display text (>300 px strokes at 2400 px) may not benefit from the
  top-hat filter; the SE would need to be larger than the full viewport width.
- Japanese OCR requires a separate WASM data file and takes longer to initialise.
- The `recognizeAllLines` function preprocesses the image again internally (the
  preprocessing result from the first call is passed back in via `imageUrl`,
  so double-preprocessing is avoided in the TitlePickerOverlay flow).
