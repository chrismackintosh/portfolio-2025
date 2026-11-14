import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://api.weather.gov/**',r=>r.abort());});
for(const [width,height] of [[390,844],[375,667],[320,568],[600,360],[390,430]]) for(const reducedMotion of ['reduce','no-preference'] as const){
 test(`mobile intro fills viewport ${width}x${height} ${reducedMotion}`,async({page})=>{
  await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.cm-intro-next')).toBeHidden();
  const dimensions=await page.evaluate(()=>{const sheet=document.querySelector('.cm-sheet')!.getBoundingClientRect(),intro=document.querySelector('.cm-intro')!.getBoundingClientRect(),wheat=document.querySelector('.cm-wheat')!.getBoundingClientRect(),next=document.querySelector('.cm-timeline')!.getBoundingClientRect();return{sheetHeight:sheet.height,sheetBottom:sheet.bottom,introBottom:intro.bottom,wheatBottom:wheat.bottom,nextTop:next.top,width:document.documentElement.scrollWidth}});
  expect(dimensions.sheetHeight).toBeGreaterThanOrEqual(height);expect(dimensions.nextTop).toBeGreaterThanOrEqual(height-1);expect(dimensions.introBottom).toBeLessThan(dimensions.sheetBottom);expect(dimensions.wheatBottom).toBeLessThanOrEqual(dimensions.sheetBottom+1);expect(dimensions.width).toBe(width);
  await page.setViewportSize({width,height:height+80});
  await expect.poll(()=>page.locator('.cm-sheet').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(height+80);
 });
}
test('enlarged mobile text grows without clipping and no JavaScript retains viewport sizing',async({browser})=>{
 const context=await browser.newContext({viewport:{width:320,height:568},javaScriptEnabled:false});
 await context.route('**/*',async route=>{if(route.request().resourceType()!=='document')return route.continue();const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('</head>','<style>.cm-intro{--cm-intro-identity-size:44px;--cm-intro-small-size:28px}</style></head>')});});
 const page=await context.newPage();await page.goto('/');
 const info=await page.evaluate(()=>{const sheet=document.querySelector('.cm-sheet')!.getBoundingClientRect(),contact=document.querySelector('.cm-intro-contact')!.getBoundingClientRect();return{height:sheet.height,bottom:sheet.bottom,contactBottom:contact.bottom,width:document.documentElement.scrollWidth}});
 expect(info.height).toBeGreaterThanOrEqual(568);expect(info.contactBottom).toBeLessThan(info.bottom);expect(info.width).toBe(320);await expect(page.locator('.cm-intro-next')).toBeHidden();await context.close();
});
test('phone safe-area padding keeps text and wheat inside the viewport',async({page,browserName})=>{
 test.skip(browserName!=='chromium','Safe-area override uses Chromium CDP');
 await page.setViewportSize({width:390,height:844});
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:47,bottom:34,left:0,right:0}});
 await page.goto('/');
 const info=await page.evaluate(()=>({top:document.querySelector('.cm-intro')!.getBoundingClientRect().top,wheatBottom:document.querySelector('.cm-wheat')!.getBoundingClientRect().bottom,sheetHeight:document.querySelector('.cm-sheet')!.getBoundingClientRect().height}));
 expect(info.top).toBeGreaterThanOrEqual(47+56);expect(info.wheatBottom).toBeLessThanOrEqual(844-34+1);expect(info.sheetHeight).toBe(844);
});
