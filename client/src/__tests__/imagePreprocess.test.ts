import {describe, it, expect} from 'vitest';
import {morphTopHat} from '../imagePreprocess.ts';

// Helper: create a flat gray image filled with `fill`, then paint a w×h rectangle
// at (px, py) with `patchVal`.
function makeImage(W: number, H: number, fill: number, px: number, py: number, pw: number, ph: number, patchVal: number): Uint8ClampedArray {
  const img = new Uint8ClampedArray(W * H).fill(fill);
  for (let y = py; y < py + ph; y++)
    for (let x = px; x < px + pw; x++)
      img[y * W + x] = patchVal;
  return img;
}

describe('morphTopHat', () => {
  it('leaves a uniform image unchanged', () => {
    const W = 40, H = 40;
    const gray = new Uint8ClampedArray(W * H).fill(128);
    const out  = morphTopHat(gray, W, H, 5);
    // 3*128 − 128 − 128 = 128 for every pixel
    for (let i = 0; i < out.length; i++) {
      expect(out[i]).toBe(128);
    }
  });

  it('boosts a bright patch on a dark background toward 255', () => {
    // 40×40 image, background=10, 4×4 bright patch (200) at center (18..21, 18..21)
    // SE radius r=5 (11×11) is larger than the 4×4 patch, so:
    //   opening removes the patch  → opened ≈ 10 everywhere
    //   closing fills back the gap → closed ≈ original (200 at patch, 10 elsewhere)
    // result at patch = 3*200 − 10 − 200 = 390 → clamped to 255
    const W = 40, H = 40;
    const gray = makeImage(W, H, 10, 18, 18, 4, 4, 200);
    const out  = morphTopHat(gray, W, H, 5);

    const centerIdx = 19 * W + 19;
    expect(out[centerIdx]).toBe(255);
  });

  it('pushes a dark patch on a light background toward 0', () => {
    // 40×40 image, background=200, 4×4 dark patch (50) at center
    // SE radius r=5 — patch smaller than SE:
    //   opening preserves the patch  → opened ≈ original (50 at patch, 200 elsewhere)
    //   closing fills the patch      → closed ≈ 200 everywhere
    // result at patch = 3*50 − 50 − 200 = −50 → clamped to 0
    const W = 40, H = 40;
    const gray = makeImage(W, H, 200, 18, 18, 4, 4, 50);
    const out  = morphTopHat(gray, W, H, 5);

    const centerIdx = 19 * W + 19;
    expect(out[centerIdx]).toBe(0);
  });

  it('leaves background pixels approximately unchanged', () => {
    // Far background pixels should not shift much because opening ≈ closing ≈ gray there
    const W = 40, H = 40;
    const gray = makeImage(W, H, 100, 18, 18, 4, 4, 200);
    const out  = morphTopHat(gray, W, H, 5);

    // Corner pixel (0,0) is far from the patch — should stay near 100
    expect(out[0]).toBeGreaterThanOrEqual(80);
    expect(out[0]).toBeLessThanOrEqual(120);
  });

  it('handles a 1×N degenerate image without crashing', () => {
    const W = 50, H = 1;
    const gray = new Uint8ClampedArray(W * H).fill(128);
    gray[25] = 200;
    expect(() => morphTopHat(gray, W, H, 5)).not.toThrow();
  });
});
