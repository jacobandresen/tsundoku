import {test, expect} from '@playwright/test';

type OverflowItem = {tag: string; cls: string; dir: 'left' | 'right'; amount: number};

// Returns elements that visually overflow the viewport in either horizontal
// direction.  Elements inside an intentionally scrollable container (overflow-x
// auto/scroll) are excluded — they are supposed to scroll.
async function getOverflowingElements(page: import('@playwright/test').Page): Promise<OverflowItem[]> {
  return page.evaluate<OverflowItem[]>(() => {
    function inHScrollContainer(el: Element): boolean {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const ox = window.getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
        p = p.parentElement;
      }
      return false;
    }

    const vpW = window.innerWidth;
    const bad: OverflowItem[] = [];

    document.querySelectorAll<Element>('*').forEach((el) => {
      if (inHScrollContainer(el)) return;
      const r = el.getBoundingClientRect();
      if (r.right > vpW + 1) {
        bad.push({
          tag: el.tagName,
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60),
          dir: 'right',
          amount: Math.round(r.right - vpW),
        });
      }
      if (r.left < -1) {
        bad.push({
          tag: el.tagName,
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60),
          dir: 'left',
          amount: Math.round(-r.left),
        });
      }
    });
    return bad;
  });
}

// Check the .app container's own scroll width.
// body { overflow-x: hidden } hides layout overflow from the document scroll
// metrics on desktop but does NOT prevent horizontal scrolling in iOS Safari —
// measuring .app directly is more reliable.
async function getAppScrollOverflow(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const app = document.querySelector('.app');
    return app ? app.scrollWidth - app.clientWidth : 0;
  });
}

// ── List view ────────────────────────────────────────────────────────────────

test('list view has no horizontal overflow', async ({page}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(await getOverflowingElements(page)).toEqual([]);
});

test('app container does not scroll horizontally on list view', async ({page}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(await getAppScrollOverflow(page)).toBe(0);
});

// ── List view with an item ────────────────────────────────────────────────────

test('list with an item has no horizontal overflow', async ({page}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Add an item through the UI so the list renders a real card.
  await page.locator('button').filter({hasText: '+'}).click();
  await page.waitForTimeout(300);
  await page.locator('#f-title').fill('The Blue Lotus — Adventures of Tintin');
  await page.locator('button[form="item-form"]').click();
  await page.waitForTimeout(300);

  expect(await getOverflowingElements(page)).toEqual([]);
  expect(await getAppScrollOverflow(page)).toBe(0);
});

// ── Add modal ─────────────────────────────────────────────────────────────────

test('add modal has no horizontal overflow', async ({page}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.locator('button').filter({hasText: '+'}).click();
  await page.waitForTimeout(300);

  expect(await getOverflowingElements(page)).toEqual([]);
});

test('add modal bottom (price / date inputs) has no horizontal overflow', async ({page}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.locator('button').filter({hasText: '+'}).click();
  await page.waitForTimeout(300);

  // .modal now has overflow:hidden; the scrollable child is .modal-body
  await page.evaluate(() => document.querySelector('.modal-body')?.scrollTo(0, 9999));
  await page.waitForTimeout(150);

  expect(await getOverflowingElements(page)).toEqual([]);
});

// ── Document-level scroll guard ───────────────────────────────────────────────

test('document does not scroll horizontally', async ({page}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const vpW = await page.evaluate(() => window.innerWidth);
  expect(scrollWidth).toBeLessThanOrEqual(vpW);
});
