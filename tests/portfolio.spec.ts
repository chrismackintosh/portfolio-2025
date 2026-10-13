import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes = ['/', '/mycolorado/', '/mycolorado/mobile-drivers-license/'];
test.beforeEach(async ({page}) => {
  await page.route('https://api.weather.gov/**', route => route.abort());
});
for (const width of [375, 960, 1440]) for (const route of routes) {
  test(`direct route and refresh ${width} ${route}`, async ({page}) => {
    const errors: string[]=[]; page.on('pageerror', e=>errors.push(e.message));
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(route);await page.evaluate(()=>document.fonts.ready);
    await expect(page.locator('h1')).toHaveCount(1);
    await page.reload();await page.evaluate(()=>document.fonts.ready);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('img').evaluateAll(imgs=>imgs.forEach(i=>{if(i instanceof HTMLImageElement)i.loading='eager'}));
    await expect.poll(()=>page.locator('img').evaluateAll(imgs=>imgs.every(i=>i instanceof HTMLImageElement && i.complete && i.naturalWidth>0))).toBe(true);
    expect(errors).toEqual([]);
  });
}
test('theme persists across routes and reload',async ({page})=>{
  await page.goto('/mycolorado/');
  await page.locator('[data-theme="dark"]').click();
  await expect(page.locator('html')).toHaveClass(/cm-night/);
  await page.goto('/mycolorado/mobile-drivers-license/');
  await expect(page.locator('[data-theme="dark"]')).toHaveAttribute('aria-pressed','true');
  await page.reload();await expect(page.locator('html')).toHaveClass(/cm-night/);
  await page.locator('[data-theme="light"]').click();
  await expect(page.locator('html')).not.toHaveClass(/cm-night/);
});
test('work navigation returns to previous homepage scroll',async ({page})=>{
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  const entry=page.locator('#mycolorado-work .cm-project-entry');
  await entry.scrollIntoViewIfNeeded();await page.waitForTimeout(300);
  const y=await page.evaluate(()=>scrollY);
  await entry.click();await expect(page).toHaveURL(/\/mycolorado\/$/);
  await expect(page.locator('.breadcrumbs')).toBeVisible();
  await page.locator('.return-link').click();await expect(page).toHaveURL(/:4175\/$/);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(y-3);
  expect(Math.abs(await page.evaluate(()=>scrollY)-y)).toBeLessThan(3);
});
test('initiative and breadcrumb navigation work',async ({page})=>{
 await page.goto('/mycolorado/');await page.locator('.initiative.featured a').click();
 await expect(page).toHaveURL(/mobile-drivers-license\/$/);
 await page.locator('.breadcrumbs a').last().click();await expect(page).toHaveURL(/\/mycolorado\/$/);
});
test('prose link underline and focus exclude arrow',async ({page})=>{
 await page.goto('/mycolorado/');const link=page.locator('.cm-inline-link').first();const words=link.locator('.cm-intro-link-text').first();
 await expect(words).toHaveCSS('text-decoration-color','rgba(0, 0, 0, 0)');
 await link.focus();await expect(words).toHaveCSS('text-decoration-thickness','2px');
 await expect.poll(()=>words.evaluate(e=>getComputedStyle(e).textDecorationColor)).not.toBe('rgba(0, 0, 0, 0)');
 await expect(link.locator('svg')).toHaveCSS('text-decoration-line','none');
 await expect(link).toHaveCSS('outline-style','solid');
 await expect(link.locator('.cm-intro-link-end')).toHaveCSS('white-space','nowrap');
});
test('odometer completes and plane pauses offscreen',async ({page})=>{
 await page.goto('/');const metric=page.locator('[data-stat-motion]');await metric.scrollIntoViewIfNeeded();
 await expect(metric).not.toHaveClass(/myco-stats-armed|myco-stats-running/,{timeout:7000});
 await expect(metric.locator('.myco-plus')).toHaveCSS('opacity','1');
 const flight=page.locator('.myco-departure');await flight.scrollIntoViewIfNeeded();
 await expect(flight).toHaveClass(/cm-mosaic-play/);
 await expect(flight.locator('.myco-plane')).toHaveCSS('animation-duration','14s');
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await expect(flight).toHaveClass(/myco-flight-paused/);
});
test('reduced motion exposes completed static content',async ({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('[data-stat-motion]')).not.toHaveClass(/myco-stats-armed|myco-stats-running/);
 await expect(page.locator('.myco-plane')).toHaveCSS('animation-name','none');
});
test('content and direct navigation survive no JavaScript',async ({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 for(const route of routes){await page.goto('http://127.0.0.1:4175'+route);await expect(page.locator('h1')).toHaveCount(1);expect(await page.locator('body').innerText()).toContain('Chris Mackintosh');}
 await context.close();
});
for(const route of routes) for(const theme of ['light','dark']) test(`axe ${theme} ${route}`,async ({page})=>{
 await page.addInitScript(theme=>localStorage.setItem('cm-color-appearance',theme),theme);
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(route);await page.evaluate(()=>document.fonts.ready);
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
 expect(result.violations).toEqual([]);
});

test('keyboard skip link and appearance control are usable', async ({page, browserName}) => {
  await page.goto('/mycolorado/');
  // macOS WebKit uses Option-Tab to include links in keyboard navigation.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.locator('[data-theme="dark"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-theme="dark"]')).toHaveAttribute('aria-pressed', 'true');
});


test('mobile intro remains full contrast before scrolling with motion enabled', async ({page}) => {
  await page.setViewportSize({width:375,height:667});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.cm-intro-title')).toHaveCSS('opacity','1');
});

test('project artwork stays clickable without becoming part of the link name', async ({page}) => {
  await page.goto('/');
  const link = page.locator('.cm-project-entry');
  await expect(link).toHaveAccessibleName('myColorado Product design and digital identity Explore myColorado');
  await expect(link.locator('[role="img"]')).toHaveCount(0);
  const mosaic = page.locator('.cm-myco-mosaic');
  await mosaic.scrollIntoViewIfNeeded();
  const box = await mosaic.boundingBox();
  if (!box) throw new Error('Artwork not visible');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page).toHaveURL(/\/mycolorado\/$/);
});


test('320px homepage reflows with increased text spacing', async ({page}) => {
  await page.setViewportSize({width:320,height:900});
  await page.goto('/');
  await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:'p{margin-bottom:2em!important}body{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}'});
  await page.evaluate(()=>dispatchEvent(new Event('resize')));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
