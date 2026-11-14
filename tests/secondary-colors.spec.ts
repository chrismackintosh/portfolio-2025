import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.setTimeout(120000);
const scenarios=[
 {sky:'Sunrise',time:'2026-10-14T13:15:00Z',description:'Clear',color:'rgb(132, 108, 116)'},
 {sky:'Sunny midday',time:'2026-10-14T18:00:00Z',description:'Clear',color:'rgb(90, 119, 133)'},
 {sky:'Cloudy',time:'2026-10-14T13:15:00Z',description:'Fog/Mist',color:'rgb(103, 117, 120)'},
 {sky:'Gray / rain',time:'2026-10-14T13:15:00Z',description:'Light Rain',color:'rgb(102, 116, 126)'},
 {sky:'Sunset',time:'2026-10-15T00:20:00Z',description:'Clear',color:'rgb(138, 106, 120)'},
 {sky:'Night',time:'2026-10-15T04:00:00Z',description:'Clear',color:'rgb(170, 180, 192)'},
];
for(const scenario of scenarios) test(`${scenario.sky}: shared secondary text follows title palette`,async({page},testInfo)=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const time=Date.parse(scenario.time); await page.clock.setFixedTime(time);
 await page.route('https://api.weather.gov/**',route=>route.fulfill({json:{properties:{station:'https://api.weather.gov/stations/KDEN',timestamp:new Date(time-60000).toISOString(),textDescription:scenario.description,cloudLayers:[],presentWeather:[]}}}));
 for(const path of ['/','/mycolorado/','/mycolorado/mobile-drivers-license/','/synack/','/case-studies/visible-core-experience.html','/case-studies/visible-esim.html']){
  await page.goto(path);await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.masthead-role')).toHaveCSS('color',scenario.color);
  const accessibility=await new AxeBuilder({page}).withRules(['color-contrast']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.masthead-role')).toHaveCSS('color',scenario.color);
  expect((await new AxeBuilder({page}).withRules(['color-contrast']).analyze()).violations).toEqual([]);
  if(path==='/' && scenario.sky==='Sunny midday') await page.screenshot({path:testInfo.outputPath('light-text-mobile.png')});
  await page.setViewportSize({width:1440,height:900});
  if(path==='/' && scenario.sky==='Sunny midday') { await page.goto('/'); await page.waitForTimeout(1000); await page.screenshot({path:testInfo.outputPath('light-text-desktop.png')}); }
  if(path==='/'){
   await expect(page.locator('.cm-intro-role')).toHaveCSS('color',scenario.sky==='Night'?'rgb(132, 143, 155)':scenario.color);
   await expect(page.locator('.cm-stop-meta').first()).toHaveCSS('color',scenario.color);
   await expect(page.locator('.cm-stop-copy p').first()).toHaveCSS('color',scenario.sky==='Night'?'rgb(230, 233, 237)':'rgb(38, 49, 59)');
  }
 }
});
