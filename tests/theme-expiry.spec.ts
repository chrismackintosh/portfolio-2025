import {test,expect} from '@playwright/test';
const key='cm-color-appearance';
test.beforeEach(async({context})=>{await context.route('https://api.weather.gov/**',r=>r.abort());});
test('legacy preference resets; manual choice persists across routes and expires on resumed page',async({page})=>{
 await page.clock.install({time:new Date('2026-11-13T19:00:00Z')});
 await page.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('cm-color-appearance','dark');sessionStorage.setItem('seeded','yes')}});
 await page.goto('/mycolorado/');await expect(page.locator('html')).not.toHaveClass(/cm-night/);
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
 await page.locator('[data-theme-toggle]').click();await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-pressed','true');
 const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);expect(saved.version).toBe(1);
 expect(saved.expiresAt).toBe(await page.evaluate(()=>(window as any).CMWeather.nextBoundary()));
 await page.goto('/');await expect(page.locator('html')).toHaveClass(/cm-night/);
 await page.clock.setSystemTime(saved.expiresAt+18*3600000);
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();await expect(page.locator('html')).not.toHaveClass(/cm-night/);
});
test('sunset timer returns to Auto, other tabs sync, reduced motion has no transition',async({context,page})=>{
 await page.clock.install({time:new Date('2026-11-13T19:00:00Z')});await page.goto('/mycolorado/');
 const other=await context.newPage();await other.clock.install({time:new Date('2026-11-13T19:00:00Z')});await other.emulateMedia({reducedMotion:'reduce'});await other.goto('/mycolorado/');
 await page.locator('[data-theme-toggle]').click();await expect(other.locator('html')).toHaveClass(/cm-night/);await expect(other.locator('html')).not.toHaveClass(/cm-theme-switching/);
 await other.locator('[data-theme-toggle]').click();await expect(page.locator('html')).not.toHaveClass(/cm-night/);
 const expiry=await page.evaluate(()=>(window as any).CMWeather.nextBoundary());
 await page.clock.fastForward(expiry-Date.parse('2026-11-13T19:00:00Z')+1);
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
 await expect(page.locator('html')).toHaveClass(/cm-night/); // automatic sunset is dark too
 await expect(other.locator('html')).toHaveClass(/cm-night/); // Playwright clock is shared by the context
 await expect(other.locator('html')).not.toHaveClass(/cm-theme-switching/);
 await other.close();
});
