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

// Capture rendered line membership, including text split across inline links/spans.
// A stable bounding box alone can miss a word moving onto a different line.
async function readingLayout(page: Page) {
  return page.evaluate(() => {
    const prose = document.querySelector('.cm-intro-prose')!.getBoundingClientRect();
    const intro = document.querySelector('.cm-intro')!.getBoundingClientRect();
    const blocks = [...document.querySelectorAll('.cm-intro h1,.cm-intro-role,.cm-intro-prose>p,.cm-intro-stack p,.cm-intro-contact p,.cm-intro-contact>a')].map(element => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const lines: { top: number; text: string }[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        for (let i = 0; i < (node.textContent?.length || 0); i++) {
          const range = document.createRange();
          range.setStart(node, i); range.setEnd(node, i + 1);
          const rect = range.getBoundingClientRect();
          if (!rect.width) continue;
          let line = lines.find(line => Math.abs(line.top - rect.top) < .5);
          if (!line) { line = { top: rect.top, text: '' }; lines.push(line); }
          line.text += node.textContent![i];
        }
      }
      return lines.map(line => line.text.trim());
    });
    return { proseLeft: prose.left, proseWidth: prose.width, introLeft: intro.left, introWidth: intro.width, blocks };
  });
}

function expectStableReading(current: Awaited<ReturnType<typeof readingLayout>>, initial: Awaited<ReturnType<typeof readingLayout>>) {
  for (const key of ['proseLeft', 'proseWidth', 'introLeft', 'introWidth'] as const) {
    expect(Math.abs(current[key] - initial[key]), key).toBeLessThan(.1);
  }
  expect(current.blocks).toEqual(initial.blocks);
}

for (const [width, height, left, right, openingMeasure] of [
  // Opening measures recorded from PR10; desktop/zero-inset values also match pre-PR9.
  [852, 393, 59, 59, 606], [932, 430, 59, 0, 526.8125], [667, 375, 0, 59, 440],
  [852, 393, 0, 0, 644], [1280, 900, 0, 0, 840], [1440, 900, 0, 0, 824], [1920, 1080, 0, 0, 824],
]) test(`card expands with stable text at ${width}px (${left}/${right} safe area)`, async ({ page, browserName }, testInfo) => {
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
  const readings = [];
  for (const fraction of [0, .25, .5, .75, 1, .75, .5, .25, 0]) {
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
    readings.push(await readingLayout(page));
    expect(frame.contentLeft).toBeGreaterThanOrEqual(left - 1);
    expect(frame.contentRight).toBeGreaterThanOrEqual(right - 1);
    expect(frame.groundLeft).toBe(0);
    expect(frame.groundWidth).toBe(width);
    expect(frame.documentWidth).toBeLessThanOrEqual(width);
  }
  await testInfo.attach('scroll-frames', { body: JSON.stringify(frames, null, 2), contentType: 'application/json' });
  await testInfo.attach('reading-layouts', { body: JSON.stringify(readings, null, 2), contentType: 'application/json' });
  expect(readings[0].proseWidth).toBeCloseTo(openingMeasure, 1);
  for (const reading of readings) expectStableReading(reading, readings[0]);
  expect(frames[0].left).toBeGreaterThanOrEqual(left);
  expect(frames[0].right).toBeGreaterThanOrEqual(right);
  for (let i = 1; i < 5; i++) {
    expect(frames[i].width).toBeGreaterThan(frames[i - 1].width);
    expect(Math.abs(frames[i].left - frames[0].left * (1 - frames[i].progress))).toBeLessThan(1);
    expect(Math.abs(frames[i].right - frames[0].right * (1 - frames[i].progress))).toBeLessThan(1);
  }
  expect(frames[4].left).toBeCloseTo(0, 0);
  expect(frames[4].right).toBeCloseTo(0, 0);
  expect(frames[4].width).toBeCloseTo(width, 0);
  expect(frames[4].radius).toBe(0);
});


test('portrait text keeps its measure and line breaks through scroll and toolbar resize', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.route('https://api.weather.gov/**', route => route.abort());
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const initial = await readingLayout(page);
  expect(initial.proseWidth).toBe(345); // Pre-PR9 portrait baseline.
  for (const height of [852, 667, 900]) {
    await page.setViewportSize({ width: 393, height });
    for (const top of [0, 100, 200, 0]) {
      await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), top);
      await expect.poll(async () => (await readingLayout(page)).blocks).toEqual(initial.blocks);
      expectStableReading(await readingLayout(page), initial);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(393);
    }
  }
  await testInfo.attach('portrait-reading-layout', { body: JSON.stringify(initial), contentType: 'application/json' });
});
