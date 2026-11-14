import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://api.weather.gov/**',r=>r.abort());});
test('mobile typography and short breeze settle; reduced motion and save data stay static',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('.cm-intro-next')).toBeHidden();
 for(const s of ['.cm-intro h1','.cm-intro-role']) {await expect(page.locator(s)).toHaveCSS('font-size','22px');await expect(page.locator(s)).toHaveCSS('font-weight','500');expect(await page.locator(s).evaluate(e=>parseFloat(getComputedStyle(e).lineHeight))).toBeCloseTo(24.2,3);}
 const canvas=page.locator('canvas.cm-wheat'),pixels=()=>canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 await expect(canvas).toBeVisible();await expect(canvas).toHaveCSS('height','351px');expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.width)).toBeLessThanOrEqual(396);
 await page.waitForTimeout(5000);let a=await pixels();await page.waitForTimeout(700);expect(await pixels()).toBe(a);
 await canvas.dispatchEvent('pointerenter');await page.waitForTimeout(700);expect(await pixels()).toBe(a);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForTimeout(300);a=await pixels();await page.waitForTimeout(700);expect(await pixels()).toBe(a);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true}));await page.reload();await page.waitForTimeout(300);a=await pixels();await page.waitForTimeout(700);expect(await pixels()).toBe(a);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});
test('weather intro contrast and Night palette',async({page})=>{
 await page.addInitScript(()=>{let theme:any;const w=window as any;w.__subscribers=[];Object.defineProperty(w,'CMTheme',{get:()=>theme,set:v=>{theme=v;const subscribe=v.subscribe;v.subscribe=(fn:any)=>{w.__subscribers.push(fn);subscribe(fn)}}});});
 await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 const pairs=new Set();
 for(const sky of ['Sunrise','Sunny midday','Cloudy','Gray / rain','Sunset','Dusk','Night']){
  await page.evaluate(sky=>(window as any).__subscribers.forEach((fn:any)=>fn({sky,dark:sky==='Night',source:'test'})),sky);
  const result=await page.evaluate(()=>{
   const lum=(s:string)=>{const a=s.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722};
   const bg=lum(getComputedStyle(document.querySelector('.cm-sheet')!).backgroundColor);
   const colors=['.cm-intro h1','.cm-intro-role','.cm-intro-contact p','.cm-intro-contact>a'].map(s=>getComputedStyle(document.querySelector(s)!).color);
   return {colors,ratios:colors.map(c=>{const l=lum(c);return(Math.max(bg,l)+.05)/(Math.min(bg,l)+.05)})};
  });
  for(const r of result.ratios)expect(r,sky).toBeGreaterThanOrEqual(4.5);
  pairs.add(result.colors.join(','));
  if(sky==='Night')expect(result.colors.slice(0,2)).toEqual(['rgb(214, 223, 236)','rgb(132, 143, 155)']);
 }
 expect(pairs.size).toBe(7);
});
