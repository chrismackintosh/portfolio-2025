import {test,expect,type Page} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://api.weather.gov/**',r=>r.abort());});
const track=(page:Page)=>page.locator('.cm-journey-window');
async function started(page:Page){await expect.poll(()=>track(page).evaluate(e=>e.scrollLeft),{intervals:[10]}).toBeGreaterThan(1);}
async function target(page:Page){return page.locator('.cm-stop').evaluateAll(es=>(es[1].getBoundingClientRect().left-es[0].getBoundingClientRect().left)*4);}
async function released(page:Page){
 await expect.poll(()=>track(page).evaluate(e=>e.dispatchEvent(new WheelEvent('wheel',{deltaY:1,bubbles:true,cancelable:true}))),{timeout:2500,intervals:[20]}).toBe(true);
 await expect(page.locator('html')).not.toHaveClass(/cm-timeline-hold/);
}
async function visibleYear(page:Page){return page.locator('.cm-journey-digit').evaluateAll(ds=>ds.map(d=>{
 const top=d.getBoundingClientRect().top;
 return [...d.querySelectorAll('.cm-journey-digit-strip>span')].sort((a,b)=>Math.abs(a.getBoundingClientRect().top-top)-Math.abs(b.getBoundingClientRect().top-top))[0].textContent;
}).join(''));}
for(const viewport of [{width:1440,height:900},{width:375,height:800}]){
 test(`scrolls to visible 2023 once and stays there at ${viewport.width}px`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/#stop-1');
  await started(page);
  const y=await page.evaluate(()=>scrollY),end=await target(page);
  const gap=()=>page.evaluate(()=>document.querySelector('.cm-timeline-heading')!.getBoundingClientRect().top-document.querySelector('.cm-masthead')!.getBoundingClientRect().bottom);
  expect(Math.abs(await gap()-16)).toBeLessThanOrEqual(1);
  await page.evaluate(()=>scrollBy({top:120,behavior:'instant'}));
  await expect.poll(()=>page.evaluate(()=>scrollY),{intervals:[10]}).toBe(y);
  expect(Math.abs(await gap()-16)).toBeLessThanOrEqual(1);
  await expect.poll(()=>visibleYear(page)).toBe('2023');await released(page);
  await expect(page.locator('.cm-journey-current-label')).toHaveCount(0);
  await expect(page.locator('#stop-5 .cm-current-period')).toHaveText('2023–Present');
  await expect(page.locator('#stop-6 .cm-stop-meta')).toHaveText('Evenings and weekends');
  expect(await track(page).evaluate(e=>e.scrollLeft)).toBeCloseTo(end,0);
  expect(await page.evaluate(()=>scrollY)).toBe(y);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.locator('.cm-timeline').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
  await page.waitForTimeout(1000);
  expect(await track(page).evaluate(e=>e.scrollLeft)).toBeCloseTo(end,0);
 });
}
test('pointer interaction stops automatic movement immediately',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#stop-1');await started(page);
 await track(page).dispatchEvent('pointerdown');const x=await track(page).evaluate(e=>e.scrollLeft);
 await page.waitForTimeout(1000);expect(await track(page).evaluate(e=>e.scrollLeft)).toBe(x);await released(page);
});
test('reduced motion never auto-scrolls or holds vertical input',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#stop-1');
 await page.waitForTimeout(1000);
 expect(await track(page).evaluate(e=>e.scrollLeft)).toBe(0);await released(page);
 await expect(page.locator('.cm-timeline')).not.toHaveClass(/cm-journey-enabled/);
});
test('vertical wheel pauses until 2023, then natural scrolling resumes',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#stop-1');await started(page);
 const y=await page.evaluate(()=>scrollY);
 await page.mouse.move(600,400);await page.mouse.wheel(0,180);await page.waitForTimeout(80);
 expect(await page.evaluate(()=>scrollY)).toBe(y);
 await released(page);expect(await visibleYear(page)).toBe('2023');
 await page.mouse.wheel(0,180);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(y+100);
});
test('horizontal wheel cancels the automatic move and scrolls content immediately',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#stop-1');await started(page);
 await page.mouse.move(600,400);await page.mouse.wheel(150,0);await released(page);
 await expect.poll(()=>track(page).evaluate(e=>e.scrollLeft)).toBeGreaterThan(50);
 await page.waitForTimeout(200);const x=await track(page).evaluate(e=>e.scrollLeft);
 await page.waitForTimeout(1000);expect(await track(page).evaluate(e=>e.scrollLeft)).toBe(x);
});
test('Escape immediately releases the pause and stops automatic movement',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#stop-1');await started(page);
 await page.keyboard.press('Escape');const x=await track(page).evaluate(e=>e.scrollLeft);await released(page);
 const y=await page.evaluate(()=>scrollY);await page.mouse.move(600,400);await page.mouse.wheel(0,180);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(y+100);
 await page.waitForTimeout(1000);expect(await track(page).evaluate(e=>e.scrollLeft)).toBe(x);
});
test('normal downward scrolling triggers the move on arrival',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{const t=document.querySelector('.cm-timeline')!;scrollTo({top:t.getBoundingClientRect().top+scrollY-400,behavior:'instant'});});
 await page.mouse.move(600,600);await page.mouse.wheel(0,260);await started(page);
 await expect.poll(()=>visibleYear(page)).toBe('2023');await released(page);
});

for(const interrupt of ['resize','reduced motion'])test(`${interrupt} releases the page hold immediately`,async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#stop-1');await started(page);
 if(interrupt==='resize')await page.setViewportSize({width:1000,height:900});
 else await page.emulateMedia({reducedMotion:'reduce'});
 await released(page);
 const y=await page.evaluate(()=>scrollY);
 await page.mouse.move(600,400);await page.mouse.wheel(0,180);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(y+100);
});

test('intro builds speed and chapter years remain independent of display labels',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#stop-1');
 await expect(page.locator('html')).toHaveClass(/cm-timeline-hold/);
 const samples=await track(page).evaluate(async e=>{
  const start=performance.now(),points=[e.scrollLeft];
  for(const delay of [250,500,750]){
   await new Promise<void>(resolve=>{function tick(){if(performance.now()-start>=delay)resolve();else requestAnimationFrame(tick)}requestAnimationFrame(tick)});
   points.push(e.scrollLeft);
  }
  return points;
 });
 expect(samples[2]-samples[1]).toBeGreaterThan(samples[1]-samples[0]);
 expect(samples[3]-samples[2]).toBeGreaterThan(samples[2]-samples[1]);
 await released(page);
 await track(page).focus();await page.keyboard.press('ArrowLeft');
 await expect.poll(()=>visibleYear(page)).toBe('2021');
 await page.keyboard.press('ArrowRight');
 await expect.poll(()=>visibleYear(page)).toBe('2023');
 await page.keyboard.press('ArrowRight');
 await expect.poll(()=>visibleYear(page)).toBe('2026');
});
