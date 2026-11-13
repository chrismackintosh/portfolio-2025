import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('cm-color-appearance','light'));});
for(const width of [1440,820,390])test(`wheat composition ${width}`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:1000});await page.goto('/');await page.waitForTimeout(1300);
 const canvas=page.locator('.cm-wheat');
 if(width>600&&width<=760)await expect(canvas).toBeHidden();else {
 await expect(canvas).toBeVisible();
 expect(await canvas.evaluate((c:HTMLCanvasElement)=>c.getContext('2d')!.getImageData(0,0,c.width,c.height).data.some((x,i)=>i%4===3&&x>0))).toBe(true);
 await page.screenshot({path:`../wheat-${info.project.name}-${width}-sunrise.png`});
 await page.evaluate(()=>document.querySelector<HTMLButtonElement>('[data-theme-toggle]')!.click());await page.waitForTimeout(500);
 await expect(page.locator('html')).toHaveClass(/cm-night/);
 await page.screenshot({path:`../wheat-${info.project.name}-${width}-night.png`});
 }
 expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('reduced motion is static and theme recolors',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.waitForTimeout(700);
 const pixels=()=>page.locator('canvas.cm-wheat').evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 const a=await pixels();await page.waitForTimeout(500);expect(await pixels()).toBe(a);
 await page.evaluate(()=>document.querySelector<HTMLButtonElement>('[data-theme-toggle]')!.click());await page.waitForTimeout(200);expect(await pixels()).not.toBe(a);
});
test('all actual weather palettes and lifecycle',async({page})=>{
 await page.addInitScript(()=>{
  let theme:any; const w=window as any;w.__themeSubscribers=[];
  Object.defineProperty(w,'CMTheme',{get:()=>theme,set:v=>{theme=v;const subscribe=v.subscribe;v.subscribe=(fn:any)=>{w.__themeSubscribers.push(fn);subscribe(fn)}}});
 });
 await page.goto('/');await page.waitForTimeout(1000);
 const pixels=()=>page.locator('canvas.cm-wheat').evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);
 const images=new Set();
 for(const sky of ['Sunrise','Sunny midday','Cloudy','Gray / rain','Sunset','Dusk','Night']){
 await page.evaluate(sky=>(window as any).__themeSubscribers.forEach((f:any)=>f({sky,dark:sky==='Night',source:'test'})),sky);
 images.add(await pixels());
 }
 expect(images.size).toBe(7);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(200);
 await page.evaluate(()=>scrollTo({top:6000,behavior:'instant'}));await page.waitForTimeout(500);
 const offscreen=await pixels();await page.waitForTimeout(500);expect(await pixels()).toBe(offscreen);
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(200);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);
 const reduced=await pixels();await page.waitForTimeout(500);expect(await pixels()).toBe(reduced);
});
