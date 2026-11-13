import {test,expect} from '@playwright/test';
test('icon-only breeze control preserves keyboard, label, hit target and contrast',async({page},info)=>{
 await page.goto('/');const button=page.locator('.cm-wheat-pause');
 await expect(button).toHaveAccessibleName('Pause breeze');await expect(button).toHaveText('');
 await expect(button).toHaveCSS('right','48px');await expect(button).toHaveCSS('bottom','48px');
 await expect(button.locator('.cm-breeze-pause-icon')).toBeVisible();await expect(button.locator('.cm-breeze-play-icon')).toBeHidden();
 const box=await button.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
 await button.focus();await expect(button).toHaveCSS('outline-style','solid');await page.keyboard.press('Enter');
 await expect(button).toHaveAccessibleName('Resume breeze');await expect(button.locator('.cm-breeze-play-icon')).toBeVisible();await expect(button.locator('.cm-breeze-pause-icon')).toBeHidden();
 await page.keyboard.press('Space');await expect(button).toHaveAccessibleName('Pause breeze');
 for(const mode of ['light','dark']){
  await page.evaluate(mode=>{localStorage.setItem('cm-color-appearance',mode);dispatchEvent(new StorageEvent('storage',{key:'cm-color-appearance'}));},mode);await page.waitForTimeout(450);
  const ratio=await button.evaluate(el=>{
   const lum=(s:string)=>{const c=s.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
   const a=lum(getComputedStyle(el).color),b=lum(getComputedStyle(document.querySelector('.cm-sheet')!).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });expect(ratio).toBeGreaterThanOrEqual(3);
  await page.screenshot({path:`../breeze-icon-${info.project.name}-${mode}.png`});
 }
});
