import { test, expect, type Page } from '@playwright/test';

async function safeArea(page: Page, browserName: string, left: number, right: number) {
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { left, right, top: 0, bottom: 0 } });
  } else {
    // Desktop WebKit has no device safe-area override. Resolve only these env()
    // tokens to synthetic pixels; exercise the real stylesheet and scroll code.
    await page.route('**/*.css', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace(
        /env\(safe-area-inset-(left|right)(?:,\s*0(?:px)?)?\)/g,
        (_, side) => `${side === 'left' ? left : right}px`,
      );
      await route.fulfill({ response, body });
    });
  }
}

for (const [width, height, left, right] of [
  [852, 393, 59, 59], [932, 430, 59, 0], [667, 375, 0, 59], [1440, 900, 0, 0],
]) test(`opening expands continuously to full width at ${width}px`, async ({ page, browserName }, testInfo) => {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('https://api.weather.gov/**', route => route.abort());
  await safeArea(page, browserName, left, right);
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('html')).toHaveClass(/cm-motion-ready/);
  const dimensions = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return { height: parseFloat(style.getPropertyValue('--cm-height')), travel: parseFloat(style.getPropertyValue('--cm-travel')) };
  });
  const frames = [];
  for (const fraction of [0, .25, .5, .75, 1]) {
    // Drive the actual scroll controller, never assign --cm-progress directly.
    await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), Math.max(0, dimensions.height - height) + dimensions.travel * fraction);
    await expect.poll(() => page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--cm-progress')))).toBeCloseTo(fraction, 1);
    const frame = await page.evaluate(() => {
      const sheet = document.querySelector('.cm-sheet')!;
      const rect = sheet.getBoundingClientRect(), content = document.querySelector('.cm-intro')!.getBoundingClientRect();
      const ground = document.querySelector('.cm-ground')!.getBoundingClientRect();
      return { progress: Number(getComputedStyle(document.documentElement).getPropertyValue('--cm-progress')), left: rect.left, right: innerWidth - rect.right, width: rect.width, radius: parseFloat(getComputedStyle(sheet).borderTopLeftRadius), contentLeft: content.left, contentRight: innerWidth - content.right, groundLeft: ground.left, groundWidth: ground.width, documentWidth: document.documentElement.scrollWidth };
    });
    frames.push(frame);
    expect(frame.contentLeft).toBeGreaterThanOrEqual(left - 1);
    expect(frame.contentRight).toBeGreaterThanOrEqual(right - 1);
    expect(frame.groundLeft).toBe(0);
    expect(frame.groundWidth).toBe(width);
    expect(frame.documentWidth).toBeLessThanOrEqual(width);
  }
  await testInfo.attach('scroll-frames', { body: JSON.stringify(frames, null, 2), contentType: 'application/json' });
  expect(frames[0].left).toBeGreaterThanOrEqual(left);
  expect(frames[0].right).toBeGreaterThanOrEqual(right);
  for (let i = 1; i < frames.length; i++) {
    expect(frames[i].width).toBeGreaterThan(frames[i - 1].width);
    expect(Math.abs(frames[i].left - frames[0].left * (1 - frames[i].progress))).toBeLessThan(1);
    expect(Math.abs(frames[i].right - frames[0].right * (1 - frames[i].progress))).toBeLessThan(1);
  }
  expect(frames.at(-1)!.left).toBeCloseTo(0, 0);
  expect(frames.at(-1)!.right).toBeCloseTo(0, 0);
  expect(frames.at(-1)!.width).toBeCloseTo(width, 0);
  expect(frames.at(-1)!.radius).toBe(0);
});
