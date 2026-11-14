import {test,expect} from '@playwright/test';
for(const dark of [false,true])test(`driver license naming and primary footer ink (${dark})`,async({page})=>{
 await page.addInitScript(dark=>localStorage.setItem('cm-color-appearance',JSON.stringify({version:1,mode:dark?'dark':'light',expiresAt:Date.now()+3600000})),dark);
 await page.route('https://api.weather.gov/**',r=>r.abort());
 for(const route of ['/','/mycolorado/','/mycolorado/mobile-drivers-license/']){
  await page.goto(route);await expect(page.locator('body')).not.toContainText(/driver[’']s license/i);
  await expect(page.locator('body')).toContainText(/driver license/i);
  for(const link of await page.locator('.cm-footer-link').all()){
   expect(await link.evaluate(e=>getComputedStyle(e).color)).toBe(dark?'rgb(230, 233, 237)':'rgb(38, 49, 59)');
  }
 }
});
