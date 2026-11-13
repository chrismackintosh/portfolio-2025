import { test, expect } from '@playwright/test';

for (const [width,height,inset] of [[951,589,80],[669,871,80],[1280,900,184]]) {
 test(`approved open-card geometry ${width}x${height}`, async ({page})=>{
  await page.setViewportSize({width,height});
  await page.route('https://api.weather.gov/**',r=>r.abort());
  await page.goto('/'); await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(800);
  await expect(page.locator('.cm-sheet')).toHaveCSS('border-top-left-radius','24px');
  expect(await page.locator('.cm-sheet').evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBe(inset);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const selector of ['.cm-intro h1','.cm-intro-contact>a','.cm-intro-next']) await expect(page.locator(selector)).toBeVisible();
  for(const theme of ['light','dark']) {
   await page.evaluate(theme=>{localStorage.setItem('cm-color-appearance',theme);},theme); await page.reload();
   await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor===getComputedStyle(document.querySelector('.cm-stage')!).backgroundColor)).toBe(true);
   expect(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor===getComputedStyle(document.querySelector('.cm-sheet')!).backgroundColor)).toBe(false);
  }
 });
}
for(const reducedMotion of ['no-preference','reduce'] as const) {
 test(`myCo curtain navigation and return ${reducedMotion}`,async ({page})=>{
  await page.emulateMedia({reducedMotion});
  await page.route('https://api.weather.gov/**',r=>r.abort());
  await page.goto('/'); await page.evaluate(()=>document.fonts.ready);
  const entry=page.locator('#mycolorado-work .cm-project-entry');
  await entry.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  await entry.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/mycolorado\/$/);
  if(reducedMotion==='no-preference') {
   expect(await page.evaluate(()=>getComputedStyle(document.documentElement,'::after').backgroundColor)).toBe('rgb(0, 125, 48)');
  }
  await expect(page.locator('html')).not.toHaveAttribute('data-work-arrival',/.+/);
  await expect(page.locator('main')).toHaveCSS('opacity','1');
  await page.locator('.return-link').click();
  await expect.poll(()=>new URL(page.url()).pathname).toBe('/');
  await expect(entry).toBeFocused();
  await expect(page.locator('html')).not.toHaveAttribute('data-work-departure','');
 });
}
