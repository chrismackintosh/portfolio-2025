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
   const property=prose&&reducedMotion==='no-preference'?'border-bottom-color':'text-decoration-color';
   const reference=page.locator('.cm-footer-link').first();
   await expect(words).toHaveCSS('transition-duration',await reference.evaluate(e=>getComputedStyle(e).transitionDuration));
   await expect(words).toHaveCSS('transition-timing-function',await reference.evaluate(e=>getComputedStyle(e).transitionTimingFunction));
   // Prose underlines belong on the words, never the animated anchor or its arrow.
   if(prose)await expect(link).toHaveCSS('text-decoration-line','none');
   await expect(words).toHaveCSS(property,'rgba(0, 0, 0, 0)');
   if(reducedMotion==='no-preference'){
    const fade=words.evaluate((e,property)=>new Promise<string[]>((resolve,reject)=>{
     const start=performance.now();
     const sample=()=>{
      const animation=e.getAnimations().find(a=>a instanceof CSSTransition&&a.transitionProperty===property);
      if(animation){
       animation.pause();const colors=[0,90,180].map(time=>{animation.currentTime=time;return getComputedStyle(e).getPropertyValue(property);});
       animation.finish();resolve(colors);
      }else if(performance.now()-start>3000)reject(new Error('Expected a running underline transition'));
      else requestAnimationFrame(sample);
     };sample();
    }),property);
    await link.hover();const colors=await fade;
    expect(colors[0]).toBe('rgba(0, 0, 0, 0)');expect(colors[1]).not.toBe(colors[0]);expect(colors[1]).not.toBe(colors[2]);
   }else await link.hover();
   await expect(words).toHaveCSS(property==='border-bottom-color'?'border-bottom-width':'text-decoration-line',property==='border-bottom-color'?'2px':'underline');
   await expect.poll(()=>words.evaluate((e,property)=>getComputedStyle(e).getPropertyValue(property)===getComputedStyle(e).color,property)).toBe(true);
   await page.mouse.move(0,0);await page.keyboard.press('Tab');await link.focus();
   await expect(link).toBeFocused();await expect(link).toHaveCSS('outline-style','solid');await expect(link).toHaveCSS('outline-width','2px');
   await expect(words).toHaveCSS(property==='border-bottom-color'?'border-bottom-width':'text-decoration-line',property==='border-bottom-color'?'2px':'underline');
   await expect.poll(()=>words.evaluate((e,property)=>getComputedStyle(e).getPropertyValue(property)===getComputedStyle(e).color,property)).toBe(true);
   if(await link.locator('svg').count())await expect(link.locator('svg')).toHaveCSS('text-decoration-line','none');
   await link.evaluate(e=>(e as HTMLElement).blur());
   await expect(words).toHaveCSS(property,'rgba(0, 0, 0, 0)');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 });
}
