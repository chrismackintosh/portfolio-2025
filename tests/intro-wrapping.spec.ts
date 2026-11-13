import {test,expect} from '@playwright/test';
test('minimal intro and relocated evidence fit all viewport boundaries',async({page})=>{
 await page.route('https://api.weather.gov/**',r=>r.abort());
 for(const width of [320,375,390,430,768,899,900,1024,1280,1440,1728]){
  await page.setViewportSize({width,height:900});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.cm-intro h1')).toHaveText('Chris Mackintosh');
  await expect(page.locator('.cm-intro-contact>a')).toHaveText('hello@chrismackintosh.work');
  await expect(page.locator('#stop-3')).toContainText('in partnership with Apple');
  await expect(page.locator('#stop-3 a[href*="fierce-network"]')).toHaveCount(1);
  await expect(page.locator('#stop-6')).toContainText('Evenings and weekends, I run');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 }
});
