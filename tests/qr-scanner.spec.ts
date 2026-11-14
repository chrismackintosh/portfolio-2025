import {test,expect} from '@playwright/test';
for(const width of [390,1440]) for(const motion of ['reduce','no-preference'] as const) {
 test(`QR scanner ${width}px ${motion}`,async ({page})=>{
  await page.setViewportSize({width,height:900});
  await page.emulateMedia({reducedMotion:motion});
  await page.goto('/');
  const tile=page.locator('.myco-scanner'),band=tile.locator('.myco-scanline'),image=tile.locator('img');
  await tile.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
  await expect(tile).toHaveCSS('background-color','rgb(245, 245, 247)');
  if(motion==='reduce') await expect(band).toHaveCSS('animation-name','none');
  else {
   await expect(band).toHaveCSS('animation-name','cm-mosaic-scan');
   await expect(band).toHaveCSS('animation-iteration-count','1');
   await expect(band).toHaveCSS('animation-duration','4.75s');
   await expect(tile.locator('i').first()).toHaveCSS('animation-iteration-count','2');
   await expect(tile.locator('i').first()).toHaveCSS('animation-duration','2.5s');
   await expect(tile.locator('i').first()).toHaveCSS('border-top-color','rgb(0, 125, 48)');
   await expect(tile.locator('i').first()).toHaveCSS('animation-name','cm-scanner-pulse');
   await expect(tile.locator('i').first()).toHaveCSS('opacity','1');
   await expect.poll(()=>tile.locator('i').first().evaluate(el=>getComputedStyle(el).transform)).not.toBe('matrix(1, 0, 0, 1, 0, 0)');
   expect(await band.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('rgba(0, 237, 101, 0)');
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   await expect(band).toHaveCSS('animation-play-state','paused');
   await tile.scrollIntoViewIfNeeded();
   await expect(band).toHaveCSS('animation-play-state','running');
   await page.waitForTimeout(5200);
   expect(await tile.evaluate(el=>el.getAnimations({subtree:true}).every(a=>a.playState==='finished'))).toBe(true);
   await expect(band).toHaveCSS('opacity','0');
   await page.emulateMedia({reducedMotion:'reduce'});
   await expect(band).toHaveCSS('animation-name','none');
  }
  await expect(band).toHaveCSS('opacity','1');
  const bounds=await tile.boundingBox(),code=await image.boundingBox();
  expect(bounds).not.toBeNull();expect(code).not.toBeNull();
  expect(code!.x).toBeGreaterThan(bounds!.x);expect(code!.x+code!.width).toBeLessThan(bounds!.x+bounds!.width);
 });
}
