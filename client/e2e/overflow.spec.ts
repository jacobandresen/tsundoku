import {test, expect} from '@playwright/test';

// Finds all elements whose right edge exceeds the viewport width.
async function getOverflowingElements(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const vpW = window.innerWidth;
    const bad: {tag: string; cls: string; overflow: number}[] = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > vpW + 1) {
        bad.push({
          tag: el.tagName,
          cls: typeof el.className === 'string' ? el.className.trim().slice(0, 60) : '',
          overflow: Math.round(r.right - vpW),
        });
      }
    });
    return bad;
  });
}

test('list view has no horizontal overflow', async ({page}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(await getOverflowingElements(page)).toEqual([]);
});

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

  // Scroll to the bottom of the modal where date/number inputs live.
  await page.evaluate(() => document.querySelector('.modal')?.scrollTo(0, 9999));
  await page.waitForTimeout(150);

  expect(await getOverflowingElements(page)).toEqual([]);
});

test('document does not scroll horizontally', async ({page}) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const vpW = await page.evaluate(() => window.innerWidth);
  expect(scrollWidth).toBeLessThanOrEqual(vpW);
});
