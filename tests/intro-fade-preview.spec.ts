import {test,expect} from '@playwright/test';
test('fade begins after fill, reverses and preserves focus',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');await page.waitForTimeout(1000);
 const c=page.locator('.cm-sheet-content');
 const scroll=async(y:number)=>{await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(120)};
 const end=await page.evaluate(()=>{const r=getComputedStyle(document.documentElement);return Math.max(0,parseFloat(r.getPropertyValue('--cm-height'))-innerHeight)+parseFloat(r.getPropertyValue('--cm-travel'))});
 await scroll(end);await expect(c).toHaveCSS('opacity','1');
 await scroll(end+150);expect(Number(await c.evaluate(e=>getComputedStyle(e).opacity))).toBeCloseTo(.5,1);
 await page.locator('.cm-intro-contact>a').focus();await page.waitForTimeout(100);await expect(c).toHaveCSS('opacity','1');
 await page.locator('.cm-intro-contact>a').evaluate(e=>(e as HTMLElement).blur());await scroll(end+300);await expect(c).toHaveCSS('opacity','0');expect(await c.evaluate(e=>(e as HTMLElement).inert)).toBe(true);
 await scroll(0);await expect(c).toHaveCSS('opacity','1');expect(await c.evaluate(e=>(e as HTMLElement).inert)).toBe(false);
});
for(const mode of ['mobile','reduced'])test(`no fade ${mode}`,async({page})=>{
 await page.setViewportSize({width:mode==='mobile'?390:1440,height:844});if(mode==='reduced')await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');await page.evaluate(()=>window.scrollTo(0,600));await page.waitForTimeout(250);await expect(page.locator('.cm-sheet-content')).toHaveCSS('opacity','1');
});
