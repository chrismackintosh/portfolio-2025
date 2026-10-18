import {test,expect} from '@playwright/test';
const routes=['/','/mycolorado/','/mycolorado/mobile-drivers-license/','/case-studies/visible-core-experience.html','/case-studies/visible-esim.html'];
for(const width of [1440,1144,900,760,601,600,375,320])test(`mastheads align across all routes at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.route('https://api.weather.gov/**',r=>r.abort());
 let baseline: null|{height:number;nameTop:number;nameLeft:number;roleTop:number;buttonTop:number;fontSize:string;lineHeight:string}=null;
 for(const route of routes){
  await page.goto(route);await page.evaluate(()=>document.fonts.ready);
  const header=page.locator('.masthead');await expect(header).toHaveCount(1);
  await expect.poll(()=>header.evaluate(e=>e.getBoundingClientRect().height)).toBe(width<=600?96:88);
  const geometry=await header.evaluate(e=>{
   const box=e.getBoundingClientRect(),name=e.querySelector('.masthead-name')!,role=e.querySelector('.masthead-role')!,button=e.querySelector('[data-theme-toggle]')!,font=getComputedStyle(name);
   return {height:box.height,nameTop:name.getBoundingClientRect().top-box.top,nameLeft:name.getBoundingClientRect().left,roleTop:role.getBoundingClientRect().top-box.top,buttonTop:button.getBoundingClientRect().top-box.top,fontSize:font.fontSize,lineHeight:font.lineHeight};
  });
  if(baseline)expect(geometry,route).toEqual(baseline);else baseline=geometry;
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const clipped=await header.evaluate(e=>Array.from(e.querySelectorAll('.masthead-identity,.masthead-context,.theme-controls')).some(c=>{const b=c.getBoundingClientRect(),h=e.getBoundingClientRect();return b.left<h.left||b.right>h.right||b.bottom>h.bottom}));
  expect(clipped,route).toBe(false);
 }
});
