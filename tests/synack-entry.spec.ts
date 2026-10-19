import {test, expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://api.weather.gov/**',r=>r.abort());});
for (const viewport of [{width:1440,height:1000},{width:375,height:800}]) {
 for (const reducedMotion of ['no-preference','reduce'] as const) {
  test(`Synack direct entry survives font loading and refresh ${viewport.width} ${reducedMotion}`,async({page})=>{
   await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion});
   await page.route('**/fonts/**',async route=>{await new Promise(resolve=>setTimeout(resolve,250));await route.continue();});
   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto('/synack/');expect(response?.status()).toBe(200);
   expect(response?.request().redirectedFrom()).toBeNull();
   for (let pass=0;pass<2;pass++) {
    if(pass)await page.reload();
    await page.evaluate(()=>document.fonts.ready);
    await expect(page).toHaveURL(/\/synack\/#stop-4$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://chrismackintosh.work/synack/');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content','https://chrismackintosh.work/synack/');
    await expect(page.locator('#title-4')).toBeInViewport();
    if(reducedMotion==='no-preference')await expect.poll(()=>page.evaluate(()=>Math.abs(document.querySelector('#stop-4')!.getBoundingClientRect().left-document.querySelector('.cm-journey-year')!.getBoundingClientRect().left))).toBeLessThan(2);
    else await expect(page.locator('.cm-timeline')).not.toHaveClass(/cm-journey-enabled/);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width);
   }
   const before=await page.evaluate(()=>scrollY);await page.mouse.move(viewport.width/2,viewport.height/2);await page.mouse.wheel(0,180);
   await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before+80);
   expect(errors).toEqual([]);
  });
 }
}
test('Synack retains explicit chapters and root asset destinations',async({page})=>{
 await page.goto('/synack/#stop-5');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('#title-5')).toBeInViewport();
 await expect(page.locator('.cm-project-entry')).toHaveAttribute('href','/mycolorado/');
 const paths=await page.locator('img').evaluateAll(images=>images.map(img=>new URL((img as HTMLImageElement).src).pathname));
 expect(paths.every(path=>path.startsWith('/assets/'))).toBeTruthy();
 for(const path of [...new Set(paths)])expect((await page.request.get(path)).ok()).toBeTruthy();
});
test('share entry retains the approved homepage content',async({page})=>{
 await page.goto('/');const home=await page.locator('main').innerText();
 await page.goto('/synack/');expect(await page.locator('main').innerText()).toBe(home);
});
test('Synack content and chapter anchors survive without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 await page.goto('http://127.0.0.1:4175/synack/');
 await expect(page.locator('#title-4')).toHaveText('Synack');
 await page.locator('.cm-rail a[href="#stop-4"]').click();
 await expect(page.locator('#title-4')).toBeInViewport();await context.close();
});
test('Synack product navigation returns to the saved reading position',async({page})=>{
 await page.goto('/synack/');await page.evaluate(()=>document.fonts.ready);
 const entry=page.locator('#mycolorado-work .cm-project-entry');
 await entry.scrollIntoViewIfNeeded();await page.waitForTimeout(300);
 const y=await page.evaluate(()=>scrollY);
 await entry.click();await expect(page).toHaveURL(/\/mycolorado\/$/);
 await page.locator('.return-link').click();await expect(page).toHaveURL(/\/synack\/#stop-4$/);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(y-3);
 expect(Math.abs(await page.evaluate(()=>scrollY)-y)).toBeLessThan(3);
});
