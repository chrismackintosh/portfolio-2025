import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);});
test('caret takes a deliberate 1.5 seconds and focuses history',async({page})=>{
 await page.getByRole('link',{name:'Explore the work',exact:true}).click();
 await expect(page.locator('#career-timeline')).toBeFocused();
 await page.waitForTimeout(250);const early=await page.evaluate(()=>scrollY);
 await page.waitForTimeout(500);const midway=await page.evaluate(()=>scrollY);expect(midway).toBeGreaterThan(early+100);
 await page.waitForTimeout(1000);expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(midway+100);
 expect(new URL(page.url()).hash).toBe('#career-timeline');
});
test('wheel and keyboard interrupt without resuming animation',async({page})=>{
 for(const input of ['wheel','keyboard']){
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  await page.getByRole('link',{name:'Explore the work',exact:true}).click();await page.waitForTimeout(250);
  if(input==='wheel')await page.mouse.wheel(0,25);else await page.keyboard.press('Escape');
  await page.waitForTimeout(200);const stopped=await page.evaluate(()=>scrollY);
  await page.waitForTimeout(1500);expect(Math.abs(await page.evaluate(()=>scrollY)-stopped)).toBeLessThan(3);
 }
});
test('reduced motion skips tween including on mobile',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
 await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await page.getByRole('link',{name:'Explore the work',exact:true}).click();await page.waitForTimeout(60);
 const y=await page.evaluate(()=>scrollY);expect(y).toBeGreaterThan(200);await page.waitForTimeout(500);
 expect(await page.evaluate(()=>scrollY)).toBe(y);await expect(page.locator('#career-timeline')).toBeFocused();
});
test('mobile caret eases and touch stops it',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await page.getByRole('link',{name:'Explore the work',exact:true}).click();await page.waitForTimeout(250);
 expect(await page.evaluate(()=>scrollY)).toBeLessThan(200);
 await page.evaluate(()=>dispatchEvent(new Event('touchstart')));const stopped=await page.evaluate(()=>scrollY);
 await page.waitForTimeout(1600);expect(await page.evaluate(()=>scrollY)).toBe(stopped);
});
test('switching reduced motion mid-transition finishes immediately',async({page})=>{
 await page.getByRole('link',{name:'Explore the work',exact:true}).click();await page.waitForTimeout(250);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
 const stopped=await page.evaluate(()=>scrollY);expect(stopped).toBeGreaterThan(300);
 await page.waitForTimeout(1600);expect(await page.evaluate(()=>scrollY)).toBe(stopped);
});

test('late user input cancels without a timeline hold taking over',async({page})=>{
 for(const input of ['wheel','keyboard']){
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  await page.getByRole('link',{name:'Explore the work',exact:true}).click();await page.waitForTimeout(1100);
  if(input==='wheel')await page.mouse.wheel(0,-80);else await page.keyboard.press('Escape');
  await page.waitForTimeout(200);const stopped=await page.evaluate(()=>scrollY);
  await page.waitForTimeout(1800);expect(Math.abs(await page.evaluate(()=>scrollY)-stopped)).toBeLessThan(3);
  await expect(page.locator('html')).not.toHaveClass(/cm-timeline-hold/);
 }
});
