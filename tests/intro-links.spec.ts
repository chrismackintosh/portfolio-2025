import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://api.weather.gov/**',route=>route.abort());});
for(const width of [375,1440])for(const reducedMotion of ['no-preference','reduce'] as const)for(const theme of ['light','dark']){
 test(`intro links underline only on hover or focus ${width} ${reducedMotion} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion});
  await page.addInitScript(theme=>localStorage.setItem('cm-color-appearance',theme),theme);
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  const links=page.locator('.cm-intro-prose a,.cm-intro-contact>a');await expect(links).toHaveCount(5);
  for(const link of await links.all()){
   await link.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
   const prose=await link.evaluate(e=>Boolean(e.closest('.cm-intro-prose')));
   const words=prose?link.locator('.cm-intro-link-text').first():link;
   // Prose underlines belong on the words, never the animated anchor or its arrow.
   if(prose)await expect(link).toHaveCSS('text-decoration-line','none');
   await expect.poll(()=>words.evaluate(e=>{const s=getComputedStyle(e);return s.textDecorationLine==='none'||s.textDecorationColor==='rgba(0, 0, 0, 0)';})).toBe(true);
   await link.hover();
   await expect(words).toHaveCSS('text-decoration-line','underline');
   await expect.poll(()=>words.evaluate(e=>getComputedStyle(e).textDecorationColor===getComputedStyle(e).color)).toBe(true);
   await page.mouse.move(0,0);await page.keyboard.press('Tab');await link.focus();
   await expect(link).toBeFocused();await expect(link).toHaveCSS('outline-style','solid');await expect(link).toHaveCSS('outline-width','2px');
   await expect(words).toHaveCSS('text-decoration-line','underline');
   await expect.poll(()=>words.evaluate(e=>getComputedStyle(e).textDecorationColor===getComputedStyle(e).color)).toBe(true);
   if(await link.locator('svg').count())await expect(link.locator('svg')).toHaveCSS('text-decoration-line','none');
   await link.evaluate(e=>(e as HTMLElement).blur());
   await expect.poll(()=>words.evaluate(e=>{const s=getComputedStyle(e);return s.textDecorationLine==='none'||s.textDecorationColor==='rgba(0, 0, 0, 0)';})).toBe(true);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 });
}
