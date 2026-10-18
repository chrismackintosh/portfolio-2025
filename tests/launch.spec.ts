import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async ({page}) => { await page.route('https://api.weather.gov/**', route => route.abort()); });
const legacyRoutes = ['/case-studies/visible-core-experience.html', '/case-studies/visible-esim.html'];
const routes = ['/', '/mycolorado/', '/mycolorado/mobile-drivers-license/', ...legacyRoutes];
for (const path of legacyRoutes) {
 test(`legacy address survives direct entry and refresh: ${path}`, async ({page}) => {
  await page.setViewportSize({width:375,height:900});
  const response = await page.goto(path); expect(response?.status()).toBe(200);
  await page.reload(); await expect(page.locator('h1')).toHaveCount(1);
  expect((await page.locator('main').innerText()).length).toBeGreaterThan(800);
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://chrismackintosh.work'+path);
  await page.locator('[data-theme-toggle]').click();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.locator('[data-theme-toggle]').click();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 });
}
test('all public pages have consistent metadata and reachable launch assets',async({page,request})=>{
 for(const path of routes){
  await page.goto(path);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://chrismackintosh.work'+path);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content',await page.title());
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content','https://chrismackintosh.work/social-preview.png');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content','summary_large_image');
  await expect(page.locator('a[href="/privacy-policy.html"], a[href="/privacy-policy"]')).toHaveCount(0);
 }
 for(const path of ['/favicon.svg','/favicon-32.png','/apple-touch-icon.png','/social-preview.png','/site.md','/llms.txt','/sitemap.xml'])expect((await request.get(path)).status()).toBe(200);
 expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
 expect(await (await request.get('/sitemap.xml')).text()).not.toContain('<loc>');
});
test('launch pages contact only the fixed NWS endpoint and set no cookies',async({page,context})=>{
 const external:string[]=[];
 page.on('request',request=>{if(new URL(request.url()).hostname!=='127.0.0.1')external.push(request.url());});
 for(const route of routes){await page.goto(route);await page.evaluate(()=>document.fonts.ready);}
 expect(external.length).toBeGreaterThan(0);expect(external.every(url=>url==='https://api.weather.gov/stations/KDEN/observations/latest')).toBe(true);expect(await context.cookies()).toEqual([]);
});
test('legacy pages remain readable without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 for(const path of legacyRoutes){await page.goto('http://127.0.0.1:4175'+path);await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('head link[href="/site.md"]')).toHaveAttribute('type','text/markdown');}
 await context.close();
});

test('retired privacy routes are absent and public directories do not link to them', async ({request}) => {
 for (const path of ['/privacy-policy.html', '/privacy-policy', '/privacy-policy/', '/privacy', '/privacy/']) {
  expect((await request.get(path)).status(), path).toBe(404);
 }
 for (const path of ['/site.md', '/llms.txt', '/sitemap.xml']) {
  expect(await (await request.get(path)).text()).not.toContain('/privacy');
 }
});
