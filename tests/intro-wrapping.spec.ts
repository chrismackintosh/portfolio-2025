import { test, expect } from '@playwright/test';

test('intro wrapping preserves mobile layout and avoids the desktop Apple widow', async ({ page }) => {
  await page.route('https://api.weather.gov/**', route => route.abort());
  for (const width of [320, 375, 390, 430, 768, 899, 900, 1024, 1280, 1440, 1728]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const intro = page.locator('.cm-intro-main');
    await expect(intro).toHaveCSS('text-wrap', width >= 900 ? 'wrap' : 'pretty');
    await expect(page.locator('.cm-intro-studio')).toHaveCSS('text-wrap', 'pretty');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    if (width >= 1280) {
      const lines = await intro.evaluate(element => {
        const node = element.lastChild!;
        const text = node.textContent!;
        const range = document.createRange();
        range.setStart(node, text.indexOf('in partnership'));
        range.setEnd(node, text.length);
        return [...range.getClientRects()].length;
      });
      expect(lines, `Apple credit at ${width}px`).toBe(1);
    }
  }
});
