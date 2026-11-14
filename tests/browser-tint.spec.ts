import {test,expect} from '@playwright/test';
for(const reducedMotion of ['no-preference','reduce'] as const)test(`opaque tint edge follows theme and resume (${reducedMotion})`,async({page})=>{
 await page.emulateMedia({reducedMotion});await page.route('https://api.weather.gov/**',r=>r.abort());
 await page.setViewportSize({width:390,height:844});await page.goto('/#stop-2');
 const strip=page.locator('.cm-browser-tint'),button=page.locator('.masthead [data-theme-toggle]');
 for(let i=0;i<3;i++){
  await expect(strip).toHaveCount(1);await expect(strip).toHaveAttribute('aria-hidden','true');
  await expect(strip).toHaveCSS('pointer-events','none');await expect(strip).toHaveCSS('height','12px');
  await expect(strip).toHaveCSS('position','fixed');await expect(strip).toHaveCSS('animation-name','none');
  await expect.poll(async()=>strip.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe(await page.locator('.cm-sheet').evaluate(e=>getComputedStyle(e).backgroundColor));
  await expect(page.locator('.masthead')).toHaveCSS('backdrop-filter','blur(16px)');
  expect(await strip.evaluate(e=>document.elementFromPoint(10,5)===e)).toBe(false);
  await button.focus();await button.press('Space');await expect(button).toBeFocused();
 }
 await page.setViewportSize({width:844,height:390});
 await page.evaluate(()=>{dispatchEvent(new Event('orientationchange'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));document.dispatchEvent(new Event('visibilitychange'));});
 await expect(strip).toHaveCount(1);
 // A breakpoint change may restore the opening section; resample at the masthead.
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 await expect(page.locator('.cm-masthead')).toHaveAttribute('aria-hidden','false');
 await expect.poll(()=>strip.evaluate(e=>e.getBoundingClientRect().width)).toBe(844);
 await expect.poll(async()=>strip.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe(await page.locator('.cm-sheet').evaluate(e=>getComputedStyle(e).backgroundColor));
 await page.emulateMedia({media:'print'});await expect(strip).toHaveCSS('display','none');
});
test('interior page tint has no focus or layout role',async({page})=>{
 await page.route('https://api.weather.gov/**',r=>r.abort());await page.goto('/mycolorado/');
 const strip=page.locator('.cm-browser-tint');await expect(strip).toHaveCount(1);
 expect(await strip.evaluate(e=>({children:e.childElementCount,tabIndex:(e as HTMLElement).tabIndex,text:e.textContent}))).toEqual({children:0,tabIndex:-1,text:''});
 await expect(page.locator('.masthead')).toHaveCSS('backdrop-filter','blur(16px)');
});

test('initial homepage keeps its weather surround unobstructed',async({page})=>{
 await page.route('https://api.weather.gov/**',r=>r.abort());await page.goto('/');
 await expect(page.locator('.cm-masthead')).toHaveAttribute('aria-hidden','true');
 await expect(page.locator('.cm-browser-tint')).toHaveCSS('display','none');
 await page.goto('/#stop-2');await expect(page.locator('.cm-browser-tint')).toHaveCSS('display','block');
});
