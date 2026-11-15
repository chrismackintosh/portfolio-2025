import {test,expect} from '@playwright/test';
test('icon-only breeze control preserves keyboard, label, hit target and contrast',async({page},info)=>{
 await page.goto('/');const button=page.locator('.cm-wheat-pause');
 await expect(button).toHaveAccessibleName('Pause breeze');await expect(button).toHaveText('');
 await expect(button).toHaveCSS('right','24px');await expect(button).toHaveCSS('bottom','24px');
 await expect(button.locator('.cm-breeze-pause-icon')).toBeVisible();await expect(button.locator('.cm-breeze-play-icon')).toBeHidden();
 const box=await button.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
 await button.focus();await expect(button).toHaveCSS('outline-style','solid');await page.keyboard.press('Enter');
 await expect(button).toHaveAccessibleName('Resume breeze');await expect(button.locator('.cm-breeze-play-icon')).toBeVisible();await expect(button.locator('.cm-breeze-pause-icon')).toBeHidden();
 await page.keyboard.press('Space');await expect(button).toHaveAccessibleName('Pause breeze');
 for(const mode of ['light','dark']){
  await page.evaluate(mode=>{localStorage.setItem('cm-color-appearance',JSON.stringify({version:1,mode:mode,expiresAt:Date.now()+3600000}));dispatchEvent(new StorageEvent('storage',{key:'cm-color-appearance'}));},mode);await page.waitForTimeout(450);
  const ratio=await button.evaluate(el=>{
   const lum=(s:string)=>{const c=s.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
   const a=lum(getComputedStyle(el).color),b=lum(getComputedStyle(document.querySelector('.cm-sheet')!).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });expect(ratio).toBeGreaterThanOrEqual(3);
  await page.screenshot({path:info.outputPath(`breeze-icon-${mode}.png`)});
 }
});

for(const width of [1440,1024,768])test(`breeze control is inset 24px inside card at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/');const button=page.locator('.cm-wheat-pause');await expect(button).toBeVisible();
 // Measure both boxes synchronously: the entrance animation moves their shared parent.
 const box=await button.evaluate(el=>{
  const b=el.getBoundingClientRect(),card=el.closest('.cm-sheet')!.getBoundingClientRect();
  return {width:b.width,height:b.height,right:card.right-b.right,bottom:card.bottom-b.bottom};
 });
 expect(box.width).toBe(44);expect(box.height).toBe(44);
 expect(box.right).toBeCloseTo(24,1);expect(box.bottom).toBeCloseTo(24,1);
});
for(const width of [760,390])test(`mobile breeze behavior remains unchanged at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/');await expect(page.locator('.cm-wheat-pause')).toBeHidden();
});
test('breeze control remains hidden with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('.cm-wheat-pause')).toBeHidden();
});
