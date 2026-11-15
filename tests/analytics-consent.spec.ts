import {test,expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const HOST='https://chrismackintosh.work';
const KEY='cm-analytics-choice';
test.afterEach(async({page})=>{await page.unrouteAll({behavior:'wait'});});
async function harness(page:Page){
 const google:string[]=[];
 await page.route('https://api.weather.gov/**',r=>r.abort());
 await page.route(HOST+'/**',async r=>{
  const u=new URL(r.request().url());const response=await page.request.get('http://127.0.0.1:4175'+u.pathname+u.search);
  const body=await response.body();
  await r.fulfill({response,body:response.headers()['content-type']?.includes('text/html')?body.toString().replace('data-analytics-enabled="false"','data-analytics-enabled="true"').replace(/data-measurement-id(?:="")?(?=[ >])/, 'data-measurement-id="G-KXMH5F1QQJ"'):body});
 });
 await page.route(/https:\/\/.*google(?:tagmanager|analytics|-analytics)\.com\//,async r=>{
  google.push(r.request().url());
  await r.fulfill({contentType:'application/javascript',body:'window.__mockGoogleLoaded=true;window.__queueAtTagExecution=Array.from(window.dataLayer||[],a=>Array.from(a));'});
 });
 return google;
}
test('local preview remains inert even after acceptance',async({page})=>{
 const google:string[]=[];page.on('request',r=>{if(/google/.test(r.url()))google.push(r.url());});
 await page.route('https://api.weather.gov/**',r=>r.abort());await page.goto('/privacy/');
 await page.locator('[data-consent="accepted"]').click();await page.reload();
 await expect(page.locator('[data-privacy-status]')).toContainText('preview does not send');expect(google).toEqual([]);
});
test('no Google before consent, refusal persists, accept sends sanitized pageview once',async({page,context})=>{
 const google=await harness(page);await page.goto(HOST+'/privacy/?email=secret@example.com#private');
 await page.waitForTimeout(150);expect(google).toEqual([]);expect(await context.cookies()).toEqual([]);
 await page.locator('[data-consent="rejected"]').click();await page.reload();expect(google).toEqual([]);
 await page.locator('[data-privacy-open]').click();await page.locator('[data-consent="accepted"]').click();
 await expect.poll(()=>google.length).toBe(1);
 await expect.poll(()=>page.evaluate(()=>((window as any).dataLayer || []).length)).toBe(5);
 const commands=await page.evaluate(()=>Array.from((window as any).dataLayer,(a:any)=>Array.from(a))) as any[];
 await expect.poll(()=>page.evaluate(()=>(window as any).__queueAtTagExecution)).toEqual(commands);
 expect(commands.find(c=>c[0]==='set')[1]).toMatchObject({send_page_view:false,page_location:HOST+'/privacy/',page_referrer:'',allow_google_signals:false,allow_ad_personalization_signals:false});
 expect(commands.filter(c=>c[0]==='event')).toEqual([['event','page_view',{send_to:'G-KXMH5F1QQJ',page_location:HOST+'/privacy/',page_referrer:'',page_title:await page.title()}]]);
 expect(commands.find(c=>c[0]==='config')[2]).toMatchObject({send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
 expect(JSON.stringify(commands)).not.toContain('secret');
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));expect(google.length).toBe(1);
});
test('withdrawal clears GA cookies, reloads without tag and stays off',async({page,context})=>{
 const google=await harness(page);await page.goto(HOST+'/privacy/');await page.locator('[data-consent="accepted"]').click();
 await expect.poll(()=>google.length).toBe(1);
 await context.addCookies([{name:'_ga',value:'test',domain:'chrismackintosh.work',path:'/'},{name:'_ga_KXMH5F1QQJ',value:'test',domain:'.chrismackintosh.work',path:'/'}]);
 await page.locator('[data-privacy-open]').click();await page.locator('[data-consent="rejected"]').click();
 await expect(page.locator('[data-privacy-status]')).toHaveText('Analytics off.');
 expect(await page.evaluate(()=>Boolean((window as any).__mockGoogleLoaded))).toBe(false);
 expect(await context.cookies()).toEqual([]);await page.reload();expect(google.length).toBe(1);
});
test('expired storage and cross-tab revocation fail closed',async({page,context})=>{
 const google=await harness(page);await page.goto(HOST+'/privacy/');await page.evaluate(KEY=>localStorage.setItem(KEY,JSON.stringify({version:1,choice:'accepted',expiresAt:1})),KEY);
 await page.goto(HOST+'/privacy/');expect(google).toEqual([]);
 await page.locator('[data-consent="accepted"]').click();await expect.poll(()=>google.length).toBe(1);
 const other=await context.newPage();await harness(other);await other.goto(HOST+'/privacy/');
 await other.evaluate(KEY=>localStorage.setItem(KEY,JSON.stringify({version:1,choice:'rejected',expiresAt:Date.now()+100000})),KEY);
 await expect(page.locator('[data-privacy-status]')).toHaveText('Analytics off.');
 expect(await page.evaluate(()=>Boolean((window as any).__mockGoogleLoaded))).toBe(false);
 await other.close();
});
test('keyboard, mobile reflow, themes and privacy notice are accessible',async({page})=>{
 await page.route('https://api.weather.gov/**',r=>r.abort());await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:740});await page.goto('/privacy/');
 for(const dark of [false,true]){
  if(dark)await page.locator('[data-theme-toggle]').click();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 if(await page.locator('#cm-analytics-choice').isVisible())await page.locator('[data-privacy-close]').click();
 await page.locator('[data-privacy-open]').click();
 await page.locator('[data-consent="rejected"]').focus();await page.keyboard.press('Enter');
 await expect(page.locator('[data-privacy-open]')).toBeFocused();await page.keyboard.press('Enter');
 await expect(page.locator('[data-consent="rejected"]')).toBeFocused();await page.keyboard.press('Escape');
 await expect(page.locator('[data-privacy-open]')).toBeFocused();await expect(page.locator('#cm-analytics-choice')).toBeHidden();
});

test('read-only storage never resurrects saved acceptance after withdrawal',async({page})=>{
 const google=await harness(page);await page.goto(HOST+'/privacy/');await page.locator('[data-consent="accepted"]').click();
 await expect.poll(()=>page.evaluate(()=>((window as any).dataLayer || []).length)).toBe(5);
 await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('blocked');};Storage.prototype.removeItem=function(){throw new Error('blocked');};});
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('blocked');};Storage.prototype.removeItem=function(){throw new Error('blocked');};});
 await page.locator('[data-privacy-open]').click();await page.locator('[data-consent="rejected"]').click();
 await expect(page.locator('#cm-analytics-choice')).toBeVisible();
 await page.reload();expect(google.length).toBe(1);expect(await page.evaluate(()=>Boolean((window as any).__mockGoogleLoaded))).toBe(false);
});
test('withdrawal while tag is still loading clears queued collection',async({page})=>{
 await harness(page);let release:()=>void=()=>{};const held=new Promise<void>(r=>release=r);
 await page.route('https://www.googletagmanager.com/**',async r=>{await held;await r.fulfill({contentType:'application/javascript',body:''}).catch(()=>{});});
 await page.goto(HOST+'/privacy/');await page.locator('[data-consent="accepted"]').click();
 await page.locator('[data-privacy-open]').click();await page.locator('[data-consent="rejected"]').click();release();
 await expect(page.locator('[data-privacy-status]')).toHaveText('Analytics off.');
 expect(await page.evaluate(()=>((window as any).dataLayer || []).length)).toBe(0);
});

test('expired active consent rechecks on resume and malformed choices never opt in',async({page})=>{
 const google=await harness(page);await page.goto(HOST+'/privacy/');
 await page.evaluate(KEY=>localStorage.setItem(KEY,'accepted'),KEY);await page.reload();expect(google).toEqual([]);
 await page.locator('[data-consent="accepted"]').click();await expect.poll(()=>page.evaluate(()=>((window as any).dataLayer || []).length)).toBe(5);
 await page.evaluate(KEY=>{localStorage.setItem(KEY,JSON.stringify({version:1,choice:'accepted',expiresAt:Date.now()-1}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));},KEY);
 await expect(page.locator('#cm-analytics-choice')).toBeVisible();
 expect(await page.evaluate(()=>Boolean((window as any).__mockGoogleLoaded))).toBe(false);expect(google.length).toBe(1);
});
test('notice follows homepage masthead, is immediate elsewhere, and footer choices precede copyright',async({page})=>{
 await page.route('https://api.weather.gov/**',r=>r.abort());
 for(const width of [320,1440])for(const route of ['/','/privacy/']){
  await page.setViewportSize({width,height:900});await page.goto(route);
  const panel=page.locator('#cm-analytics-choice');
  if(route==='/'){await expect(panel).toBeHidden();await page.locator('.cm-footer-meta').scrollIntoViewIfNeeded();await expect(page.locator('.cm-masthead')).toHaveAttribute('aria-hidden','false');}
  await expect(panel).toBeVisible();
  const box=await panel.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(900);
  await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
  expect(await page.locator('.cm-footer-meta').evaluate(e=>e.children[0].classList.contains('cm-privacy-links'))).toBe(true);
  await page.locator('[data-privacy-close]').click();await expect(panel).toBeHidden();
  await expect(page.locator('main')).toBeFocused();
  await page.locator('[data-privacy-open]').click();await expect(panel).toBeVisible();
  await page.locator('.cm-privacy-links a').focus();await expect(panel).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 }
});

test('action order and continuous fade exactly match masthead, including reduced motion',async({page})=>{
 await page.route('https://api.weather.gov/**',r=>r.abort());await page.setViewportSize({width:1440,height:900});await page.goto('/');
 await page.waitForTimeout(1800);
 expect(await page.locator('.cm-privacy-actions').evaluate(e=>Array.from(e.querySelectorAll('a,button')).map(c=>c.textContent))).toEqual(['Privacy details','No thanks','Allow analytics']);
 for(const offset of [0,14,28,42,56]){
  await page.evaluate(offset=>{const el=document.querySelector('.cm-intro h1')!;window.scrollBy({top:el.getBoundingClientRect().bottom+offset,behavior:'instant'});},offset);
  await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
  const values=await page.evaluate(()=>[getComputedStyle(document.querySelector('.cm-masthead')!).opacity,getComputedStyle(document.querySelector('#cm-analytics-choice')!).opacity].map(Number));
  expect(values[1]).toBeCloseTo(values[0],3);expect(values[0]).toBeCloseTo(offset/56,1);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
 await page.locator('.cm-footer-meta').scrollIntoViewIfNeeded();
 await expect(page.locator('.cm-masthead')).toHaveAttribute('aria-hidden','false');
 const values=await page.evaluate(()=>[getComputedStyle(document.querySelector('.cm-masthead')!).opacity,getComputedStyle(document.querySelector('#cm-analytics-choice')!).opacity]);
 expect(values).toEqual(['1','1']);
});
