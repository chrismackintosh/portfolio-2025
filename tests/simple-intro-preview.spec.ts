import { test, expect } from '@playwright/test';
for (const mobile of [false,true]) {
 test(`simple intro ${mobile?'mobile':'desktop'}`, async ({page},testInfo)=>{
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000});
  await page.addInitScript(()=>localStorage.setItem('cm-color-appearance','light'));
  await page.goto('/'); await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1000);
  await expect(page.locator('#stop-3')).toContainText('one of the first ways');
  await expect(page.locator('#stop-6')).toContainText('Currently building with');
  await expect(page.locator('#stop-6')).toContainText('Evenings and weekends, I run');
  const next=page.locator('.cm-intro-next');
  if(mobile)await expect(next).toBeHidden();else await expect(next).toBeVisible();
  await expect(page.locator('.cm-intro-contact>a')).toHaveCSS('font-weight','600');
  if(!mobile) expect(await page.locator('.cm-sheet').evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBe(184);
  expect(await page.locator('.cm-intro-role').evaluate(e=>getComputedStyle(e).color)).not.toBe('');
  await expect(page.locator('.cm-sheet')).toHaveCSS('box-shadow','none');
  expect(await page.locator('.cm-intro-prose').count()).toBe(0);
  if(!mobile)expect(await next.evaluate(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44})).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`../${testInfo.project.name}-${mobile?'mobile':'desktop'}-light.png`});
  if(!mobile){await next.click(); await page.waitForTimeout(1800);
  expect(await page.locator('#career-timeline').evaluate(e=>document.activeElement===e)).toBe(true);}
  await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector<HTMLButtonElement>('button[data-theme-toggle]')?.click()});
  await page.waitForTimeout(500);
  await expect(page.locator('.cm-sheet')).toHaveCSS('box-shadow','none');
  await page.screenshot({path:`../${testInfo.project.name}-${mobile?'mobile':'desktop'}-night.png`});
 });
}
