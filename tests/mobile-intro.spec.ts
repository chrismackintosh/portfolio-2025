import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://api.weather.gov/**',r=>r.abort());});
test('phone intro fills resized viewport and stays stable through scroll',async({page})=>{
 await page.setViewportSize({width:375,height:667});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 const sheet=page.locator('.cm-sheet');const opening=page.locator('.cm-opening');
 await expect(page.locator('.cm-ground')).toHaveCSS('display','none');
 await expect(sheet).toHaveCSS('animation-name','none');await expect(page.locator('.cm-stage')).toHaveCSS('position','relative');
 const initial=await opening.boundingBox();expect(initial).not.toBeNull();
 for(const height of [800,600,667]){
  await page.setViewportSize({width:375,height});await page.evaluate(()=>scrollTo({top:100,behavior:'instant'}));
  const box=await sheet.boundingBox();expect(box?.x).toBe(0);expect(box?.width).toBe(375);
  // The approved intro follows the dynamic viewport and can grow for content.
  expect(box!.height).toBeGreaterThanOrEqual(height);
  expect((await opening.boundingBox())!.height).toBeCloseTo(box!.height,0);
  const beforeScroll=(await opening.boundingBox())!.height;await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  expect((await opening.boundingBox())!.height).toBe(beforeScroll);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(375);
 }
 await page.setViewportSize({width:900,height:800});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await expect(page.locator('.cm-ground')).not.toHaveCSS('display','none');await expect(page.locator('.cm-stage')).toHaveCSS('position','sticky');
 await page.setViewportSize({width:375,height:667});await expect(page.locator('.cm-ground')).toHaveCSS('display','none');
});
for(const theme of ['light','dark'])test(`icon-only theme and filled project controls retain ${theme} touch size`,async({page})=>{
 await page.addInitScript(theme=>localStorage.setItem('cm-color-appearance',JSON.stringify({version:1,mode:theme,expiresAt:Date.now()+3600000})),theme);await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await page.locator('#stop-2').evaluate(e=>e.scrollIntoView({behavior:'instant'}));
 const styles=await page.evaluate(()=>['.theme-controls button','.cm-project-action'].map(selector=>{const e=document.querySelector(selector)!;const s=getComputedStyle(e),r=e.getBoundingClientRect();return {background:s.backgroundColor,border:s.borderColor,borderWidth:s.borderWidth,color:s.color,height:r.height};}));
 expect(styles[0].background).toBe('rgba(0, 0, 0, 0)');expect(styles[0].borderWidth).toBe('0px');
 expect(styles[1].background).toBe(theme==='dark'?'rgba(175, 195, 215, 0.08)':'rgba(98, 124, 144, 0.08)');expect(styles[1].borderWidth).toBe('1px');
 expect(styles[0].color).toBe(styles[1].color);for(const style of styles)expect(style.height).toBeGreaterThanOrEqual(44);
 await expect(page.locator('.cm-masthead')).toHaveAttribute('aria-hidden','false');
 const button=page.locator('[data-theme-toggle]');await button.focus();await page.keyboard.press('Space');await expect(button).toHaveAttribute('aria-pressed',String(theme!=='dark'));await expect(button).toHaveCSS('outline-style','solid');
});
