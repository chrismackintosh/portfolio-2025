import {test,expect} from '@playwright/test';
const routes=['/','/mycolorado/','/mycolorado/mobile-drivers-license/','/case-studies/visible-core-experience.html','/case-studies/visible-esim.html'];
for(const width of [1440,1144,900,760,601,600,375,320])test(`mastheads preserve shared geometry and scoped gutters at ${width}px`,async({page,browserName})=>{
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
  const expectedLeft=width<=760?24:Math.max(width*.06,(width-1240)/2);
  if(route==='/'){
   expect(geometry.nameLeft).toBeCloseTo(width<=600?24:width<=900?32:Math.max(32,width*.06),0);
  }else{
   expect(geometry.nameLeft).toBeCloseTo(expectedLeft,0);
  }
  const {nameLeft,...shared}=geometry;
  if(baseline){const {nameLeft:unused,...prior}=baseline;expect(shared,route).toEqual(prior);}else baseline=geometry;
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const clipped=await header.evaluate(e=>Array.from(e.querySelectorAll('.masthead-identity,.masthead-context,.theme-controls')).some(c=>{const b=c.getBoundingClientRect(),h=e.getBoundingClientRect();return b.left<h.left||b.right>h.right||b.bottom>h.bottom}));
  expect(clipped,route).toBe(false);
 }
});

for(const width of [390,1440])test(`masthead blurs scrolled content with opaque accessibility fallback at ${width}px`,async({page,browserName})=>{
 await page.setViewportSize({width,height:900});
 await page.route('https://api.weather.gov/**',r=>r.abort());
 await page.goto('/#stop-2');
 const header=page.locator('.masthead');
 await expect(header).toHaveCSS('backdrop-filter','blur(16px)');
 await expect(header).toHaveCSS('opacity','1');
 if(browserName!=='chromium')return; // CDP transparency override is Chromium-only.
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
 await expect(header).toHaveCSS('backdrop-filter','none');
 expect(await header.evaluate(e=>getComputedStyle(e).backgroundColor)).toMatch(/^rgb\(/);
});

for(const width of [390,1440])test(`masthead theme icon keeps keyboard access without button surface at ${width}px`,async({page,browserName})=>{
 await page.setViewportSize({width,height:900});await page.route('https://api.weather.gov/**',r=>r.abort());
 await page.goto('/#stop-2');const button=page.locator('.masthead [data-theme-toggle]');
 await expect(button).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(button).toHaveCSS('border-top-width','0px');
 const box=await button.boundingBox();expect(box?.width).toBe(44);expect(box?.height).toBe(44);
 await button.focus();await expect(button).toHaveCSS('outline-style','solid');
 const before=await button.getAttribute('aria-pressed');await button.press('Space');await expect(button).toHaveAttribute('aria-pressed',before==='true'?'false':'true');
 await expect(button).toHaveAccessibleName('Dark mode');await expect(button).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
});
