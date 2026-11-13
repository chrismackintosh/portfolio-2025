import {test,expect} from '@playwright/test';
test('persistent breeze pauses, resumes and grows with card',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 const canvas=page.locator('canvas.cm-wheat');const pixels=()=>canvas.evaluate((c:HTMLCanvasElement)=>c.toDataURL());
 await page.waitForTimeout(6000);const a=await pixels();await page.waitForTimeout(450);expect(await pixels()).not.toBe(a);
 const before=await canvas.boundingBox();await page.getByRole('button',{name:'Pause breeze'}).focus();await page.keyboard.press('Enter');
 const paused=await pixels();await page.waitForTimeout(600);expect(await pixels()).toBe(paused);
 await page.keyboard.press('Enter');await page.waitForTimeout(600);expect(await pixels()).not.toBe(paused);
 await page.evaluate(()=>scrollTo({top:420,behavior:'instant'}));await page.waitForTimeout(250);
 const after=await canvas.boundingBox();expect(after!.width).toBeGreaterThan(before!.width);expect(after!.height).toBeGreaterThan(before!.height);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);const reduced=await pixels();await page.waitForTimeout(500);expect(await pixels()).toBe(reduced);await expect(page.locator('.cm-wheat-pause')).toBeHidden();
});
test('automatic palette and saved override restored',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.removeItem('cm-color-appearance');let weather:any;
  Object.defineProperty(window,'CMWeather',{get:()=>weather,set:v=>{weather={...v,start:(fn:any)=>{(window as any).__setWeather=fn;fn({dark:false,sky:'Cloudy',source:'test'})}}}});
 });
 await page.goto('/');await page.waitForTimeout(400);
 const gradient=()=>page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--cm-weather-gradient'));
 expect(await gradient()).toContain('#d6dfe5');
 await page.evaluate(()=>(window as any).__setWeather({dark:false,sky:'Sunset',source:'test'}));expect(await gradient()).toContain('#d8d5e2');
 await page.evaluate(()=>{localStorage.setItem('cm-color-appearance','dark');dispatchEvent(new StorageEvent('storage',{key:'cm-color-appearance'}))});expect(await gradient()).toContain('#101725');
 await page.evaluate(()=>{localStorage.removeItem('cm-color-appearance');dispatchEvent(new StorageEvent('storage',{key:'cm-color-appearance'}))});expect(await gradient()).toContain('#d8d5e2');
});
