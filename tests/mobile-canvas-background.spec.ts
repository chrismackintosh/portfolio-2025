import {test,expect} from '@playwright/test';
for(const width of [390,432]) for(const mode of ['light','dark']){
 test(`phone canvas matches page ${width}px ${mode}`,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.addInitScript(mode=>localStorage.setItem('cm-color-appearance',JSON.stringify({version:1,mode,expiresAt:Date.now()+3600000})),mode);
  await page.route('https://api.weather.gov/**',route=>route.abort());await page.goto('/');
  const color=mode==='dark'?'rgb(29, 35, 43)':'rgb(255, 255, 255)';
  for(const selector of ['html','body','.cm-stage','.cm-sheet'])await expect(page.locator(selector)).toHaveCSS('background-color',color);
  await page.goto('/#work');await page.getByRole('button',{name:'Dark mode'}).click();
  const changed=mode==='dark'?'rgb(255, 255, 255)':'rgb(29, 35, 43)';
  for(const selector of ['html','body','.cm-stage','.cm-sheet'])await expect(page.locator(selector)).toHaveCSS('background-color',changed);
 });
}
