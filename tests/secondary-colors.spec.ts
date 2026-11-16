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
  await expect.poll(()=>page.evaluate(()=>(window as any).CMWeather.current().source)).toBe('NWS observation');
  // Palette math is covered independently in unit/solar-palette.test.mjs. Here
  // verify every rendered surface follows it and retain real contrast audits.
  const expectedColor=scenario.sky==='Night'?scenario.color:await page.evaluate(()=>{
   let state:any;(window as any).CMTheme.subscribe((value:any)=>state=value);
   const hex=(window as any).CMSolarPalette.resolve(state).text[1];
   return 'rgb('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+')';
  });
  await expect(page.locator('.masthead-role')).toHaveCSS('color',expectedColor);
  const accessibility=await new AxeBuilder({page}).withRules(['color-contrast']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.masthead-role')).toHaveCSS('color',expectedColor);
  expect((await new AxeBuilder({page}).withRules(['color-contrast']).analyze()).violations).toEqual([]);
  if(path==='/' && scenario.sky==='Sunny midday') await page.screenshot({path:testInfo.outputPath('light-text-mobile.png')});
  await page.setViewportSize({width:1440,height:900});
  if(path==='/' && scenario.sky==='Sunny midday') { await page.goto('/'); await page.waitForTimeout(1000); await page.screenshot({path:testInfo.outputPath('light-text-desktop.png')}); }
  if(path==='/'){
   await expect(page.locator('.cm-intro-role')).toHaveCSS('color',scenario.sky==='Night'?'rgb(132, 143, 155)':expectedColor);
   await expect(page.locator('.cm-stop-meta').first()).toHaveCSS('color',expectedColor);
   await expect(page.locator('.cm-stop-copy p').first()).toHaveCSS('color',scenario.sky==='Night'?'rgb(230, 233, 237)':'rgb(38, 49, 59)');
  }
 }
});
