import {test,expect} from '@playwright/test';
const endpoint='https://api.weather.gov/stations/KDEN/observations/latest';
const palettes:Record<string,string>={Sunrise:'#d8e0e8','Sunny midday':'#d0deea',Cloudy:'#d6dfe5','Gray / rain':'#cbd3da',Sunset:'#d8d5e2',Dusk:'#c5cedd',Night:'#101725'};
const cases=[
 {sky:'Sunrise',time:'2026-10-14T13:15:00Z',description:'Clear',dark:false},
 {sky:'Sunny midday',time:'2026-10-14T18:00:00Z',description:'Clear',dark:false},
 {sky:'Cloudy',time:'2026-10-14T13:15:00Z',description:'Fog/Mist',dark:false},
 {sky:'Gray / rain',time:'2026-10-14T13:15:00Z',description:'Light Rain',dark:false},
 {sky:'Sunset',time:'2026-10-15T00:20:00Z',description:'Clear',dark:false},
 {sky:'Dusk',time:'2026-10-15T01:15:00Z',description:'Clear',dark:true},
 {sky:'Night',time:'2026-10-15T04:00:00Z',description:'Clear',dark:true},
 {sky:'Cloudy',time:'2026-10-14T13:00:00Z',description:'Overcast',dark:true},
 {sky:'Gray / rain',time:'2026-10-15T00:35:00Z',description:'Light Rain',dark:true},
];
for(const scenario of cases) for(const mode of ['auto','light','dark'])test(`${scenario.sky} ${scenario.time} with ${mode} appearance`,async({page})=>{
 const time=Date.parse(scenario.time);
 await page.clock.setFixedTime(time);
 if(mode!=='auto')await page.addInitScript(mode=>localStorage.setItem('cm-color-appearance',mode),mode);
 await page.route(endpoint,route=>route.fulfill({json:{properties:{station:'https://api.weather.gov/stations/KDEN',timestamp:new Date(time-60000).toISOString(),textDescription:scenario.description,cloudLayers:[],presentWeather:[]}}}));
 await page.goto('/');
 const dark=mode==='auto'?scenario.dark:mode==='dark';
 const expectedSky=mode==='dark'?'Night':mode==='light'&&['Night','Dusk'].includes(scenario.sky)?'Sunny midday':scenario.sky;
 const state=()=>page.evaluate(()=>{let state:any;(window as any).CMTheme.subscribe((value:any)=>state=value);return state;});
 await expect.poll(async()=> (await state()).source).toBe('NWS observation');
 expect(await state()).toMatchObject({sky:expectedSky,dark});
 await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-pressed',String(dark));
 const renderedSky=dark?'Night':expectedSky;
 await expect.poll(()=>page.locator('html').evaluate(e=>(e as HTMLElement).style.getPropertyValue('--cm-weather-gradient'))).toContain(palettes[renderedSky]);
 await expect(page.locator(dark?'.theme-icon-moon':'.theme-icon-sun')).not.toHaveCSS('display','none');
});
for(const failure of ['offline','http error','stale','missing'])test(`weather ${failure} falls back without breaking the sky`,async({page})=>{
 const time=Date.parse('2026-10-14T13:15:00Z');await page.clock.setFixedTime(time);
 await page.route(endpoint,route=>failure==='offline'?route.abort():failure==='http error'?route.fulfill({status:503,body:'Unavailable'}):route.fulfill({json:failure==='missing'?{}:{properties:{station:'https://api.weather.gov/stations/KDEN',timestamp:new Date(time-121*60000).toISOString(),textDescription:'Rain'}}}));
 await page.goto('/');
 await expect.poll(()=>page.locator('html').evaluate(e=>(e as HTMLElement).style.getPropertyValue('--cm-weather-gradient'))).toContain(palettes.Sunrise);
 await expect(page.locator('html')).not.toHaveClass(/cm-night/);
});
